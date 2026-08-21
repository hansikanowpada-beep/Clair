const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");
const { requireAuth, requireAccountType } = require("../middleware/auth");

const router = express.Router();

// A doctor asks to post about a specific patient's case; nothing goes live
// until that patient approves it. See schema.sql's comment on
// feed_post_requests for why patient_account_id is nullable at creation
// and only gets claimed on response — same name-addressed pattern
// patient_followups already uses, not a strict account link.

const DOCTOR_TYPES = ["individual_doctor", "hospital_doctor"];

const createSchema = z.object({
  patientDisplayName: z.string().min(1),
  findings: z.string().optional(),
  course: z.string().optional(),
  workup: z.string().optional(),
});

router.post("/", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid request payload.", details: parsed.error.flatten() });
  const d = parsed.data;

  const result = await pool.query(
    `INSERT INTO feed_post_requests (doctor_id, patient_display_name, findings, course, workup)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [req.account.id, d.patientDisplayName, d.findings || null, d.course || null, d.workup || null]
  );
  res.status(201).json({ request: result.rows[0] });
});

// This doctor's own sent requests, all statuses.
router.get("/mine", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const result = await pool.query(
    `SELECT r.*, a.display_name AS doctor_name, a.specialty AS doctor_specialty
     FROM feed_post_requests r JOIN accounts a ON a.id = r.doctor_id
     WHERE r.doctor_id = $1 ORDER BY r.requested_at DESC`,
    [req.account.id]
  );
  res.json({ requests: result.rows });
});

// Pending requests addressed to this patient — matched by their own
// display_name (see the module comment above), not a strict account link,
// so this can only ever surface requests genuinely naming this patient.
router.get("/pending-for-me", requireAuth, requireAccountType("patient"), async (req, res) => {
  const me = await pool.query(`SELECT display_name FROM accounts WHERE id = $1`, [req.account.id]);
  const result = await pool.query(
    `SELECT r.*, a.display_name AS doctor_name, a.specialty AS doctor_specialty
     FROM feed_post_requests r JOIN accounts a ON a.id = r.doctor_id
     WHERE r.status = 'pending'
       AND r.patient_display_name = $1
       AND (r.patient_account_id IS NULL OR r.patient_account_id = $2)
     ORDER BY r.requested_at DESC`,
    [me.rows[0].display_name, req.account.id]
  );
  res.json({ requests: result.rows });
});

async function claimPendingRequest(requestId, patientAccountId) {
  const me = await pool.query(`SELECT display_name FROM accounts WHERE id = $1`, [patientAccountId]);
  const result = await pool.query(
    `SELECT * FROM feed_post_requests
     WHERE id = $1 AND status = 'pending' AND patient_display_name = $2
       AND (patient_account_id IS NULL OR patient_account_id = $3)`,
    [requestId, me.rows[0].display_name, patientAccountId]
  );
  return result.rows[0] || null;
}

// Approving creates the real feed_posts row (kind: case_highlight) and
// claims the request in one go. `text` is accepted from the client rather
// than recomposed here — the frontend already builds it deterministically
// from findings/course/workup (formatCaseHighlight in ClairMDEHR.jsx), so
// this stays byte-identical to what the patient actually saw and approved
// rather than risking drift from a second, server-side composition.
const approveSchema = z.object({ text: z.string().min(1) });

router.post("/:id/approve", requireAuth, requireAccountType("patient"), async (req, res) => {
  const parsed = approveSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "text is required." });

  const request = await claimPendingRequest(req.params.id, req.account.id);
  if (!request) return res.status(404).json({ error: "No matching pending request found." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const post = await client.query(
      `INSERT INTO feed_posts (doctor_id, kind, text) VALUES ($1, 'case_highlight', $2) RETURNING *`,
      [request.doctor_id, parsed.data.text]
    );
    const updated = await client.query(
      `UPDATE feed_post_requests
       SET status = 'approved', patient_account_id = $1, responded_at = now(), created_feed_post_id = $2
       WHERE id = $3
       RETURNING *`,
      [req.account.id, post.rows[0].id, request.id]
    );
    await client.query("COMMIT");
    res.json({ request: updated.rows[0], post: post.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

router.post("/:id/decline", requireAuth, requireAccountType("patient"), async (req, res) => {
  const request = await claimPendingRequest(req.params.id, req.account.id);
  if (!request) return res.status(404).json({ error: "No matching pending request found." });

  const result = await pool.query(
    `UPDATE feed_post_requests SET status = 'declined', patient_account_id = $1, responded_at = now()
     WHERE id = $2 RETURNING *`,
    [req.account.id, request.id]
  );
  res.json({ request: result.rows[0] });
});

module.exports = router;
