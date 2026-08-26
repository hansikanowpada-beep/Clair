const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");
const { requireAuth, requireAccountType } = require("../middleware/auth");
const { requireUnrestrictedAdmin } = require("../middleware/adminRestriction");

const router = express.Router();

// Links a doctor account to a hospital account — supports the dual-
// practice pattern (a doctor working hospital shifts AND running their
// own private clinic) without forcing two separate logins. See
// schema.sql's hospital_affiliations comment and routes/records.js's
// billingContextId handling for how a note picks which plan it counts
// against once affiliated.

// Hospital adds a doctor by their account ID (the doctor must already
// have an account — this doesn't create one). No accept/reject flow yet:
// the hospital administrator is trusted to only add doctors who actually
// work there, same trust level as care-team instruction creation
// elsewhere in this backend. Revisit if abuse becomes a real problem.
const addSchema = z.object({ doctorAccountId: z.string().uuid() });

router.post("/", requireAuth, requireAccountType("hospital"), requireUnrestrictedAdmin, async (req, res) => {
  const parsed = addSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "doctorAccountId is required." });

  const doctorExists = await pool.query(
    `SELECT 1 FROM accounts WHERE id = $1 AND account_type IN ('individual_doctor', 'hospital_doctor') AND deactivated_at IS NULL`,
    [parsed.data.doctorAccountId]
  );
  if (doctorExists.rows.length === 0) {
    return res.status(404).json({ error: "Doctor account not found." });
  }

  const result = await pool.query(
    `INSERT INTO hospital_affiliations (doctor_account_id, hospital_account_id)
     VALUES ($1, $2)
     ON CONFLICT (doctor_account_id, hospital_account_id) DO UPDATE
       SET revoked_at = NULL, joined_at = now()
     RETURNING id, doctor_account_id, joined_at`,
    [parsed.data.doctorAccountId, req.account.id]
  );
  res.status(201).json({ affiliation: result.rows[0] });
});

// Hospital's own view of currently-affiliated doctors.
router.get("/", requireAuth, requireAccountType("hospital"), async (req, res) => {
  const result = await pool.query(
    `SELECT a.id, d.display_name, d.specialty, a.joined_at
     FROM hospital_affiliations a
     JOIN accounts d ON d.id = a.doctor_account_id
     WHERE a.hospital_account_id = $1 AND a.revoked_at IS NULL
     ORDER BY a.joined_at DESC`,
    [req.account.id]
  );
  res.json({ affiliations: result.rows });
});

// A doctor's own view of which hospitals they're currently affiliated
// with — powers the "which hat am I wearing" picker when creating a note.
router.get("/mine", requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT a.id, h.id AS hospital_account_id, h.display_name AS hospital_name, a.joined_at
     FROM hospital_affiliations a
     JOIN accounts h ON h.id = a.hospital_account_id
     WHERE a.doctor_account_id = $1 AND a.revoked_at IS NULL
     ORDER BY a.joined_at DESC`,
    [req.account.id]
  );
  res.json({ affiliations: result.rows });
});

// --- Doctor-initiated requests --------------------------------------------
// The doctor-side counterpart to the hospital's direct-add flow above.
// Unlike that one, this can't take effect immediately — a doctor
// unilaterally creating a hospital_affiliations row would let them bill
// notes against a hospital's plan without that hospital's consent. So
// this creates a REQUEST instead; only the hospital's own approve action
// below ever creates the real affiliation.
const requestSchema = z.object({ hospitalAccountId: z.string().uuid() });
const DOCTOR_TYPES = ["individual_doctor", "hospital_doctor"];

router.post("/requests", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "hospitalAccountId is required." });

  const hospitalExists = await pool.query(
    `SELECT 1 FROM accounts WHERE id = $1 AND account_type = 'hospital' AND deactivated_at IS NULL`,
    [parsed.data.hospitalAccountId]
  );
  if (hospitalExists.rows.length === 0) return res.status(404).json({ error: "Hospital account not found." });

  const alreadyAffiliated = await pool.query(
    `SELECT 1 FROM hospital_affiliations WHERE doctor_account_id = $1 AND hospital_account_id = $2 AND revoked_at IS NULL`,
    [req.account.id, parsed.data.hospitalAccountId]
  );
  if (alreadyAffiliated.rows.length > 0) return res.status(400).json({ error: "Already affiliated with this hospital." });

  const result = await pool.query(
    `INSERT INTO hospital_affiliation_requests (doctor_account_id, hospital_account_id)
     VALUES ($1, $2)
     ON CONFLICT (doctor_account_id, hospital_account_id) DO UPDATE
       SET status = 'pending', responded_at = NULL, created_at = now()
     RETURNING id, hospital_account_id, status, created_at`,
    [req.account.id, parsed.data.hospitalAccountId]
  );
  res.status(201).json({ request: result.rows[0] });
});

// Hospital's inbox of pending requests.
router.get("/requests/pending", requireAuth, requireAccountType("hospital"), async (req, res) => {
  const result = await pool.query(
    `SELECT r.id, r.doctor_account_id, d.display_name AS doctor_name, d.specialty AS doctor_specialty, r.created_at
     FROM hospital_affiliation_requests r JOIN accounts d ON d.id = r.doctor_account_id
     WHERE r.hospital_account_id = $1 AND r.status = 'pending'
     ORDER BY r.created_at ASC`,
    [req.account.id]
  );
  res.json({ requests: result.rows });
});

// A doctor's own view of requests they've sent, so they can see whether
// each is still pending, was approved, or was declined.
router.get("/requests/mine", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const result = await pool.query(
    `SELECT r.id, r.hospital_account_id, h.display_name AS hospital_name, r.status, r.created_at, r.responded_at
     FROM hospital_affiliation_requests r JOIN accounts h ON h.id = r.hospital_account_id
     WHERE r.doctor_account_id = $1
     ORDER BY r.created_at DESC`,
    [req.account.id]
  );
  res.json({ requests: result.rows });
});

// Hospital approves — creates the real affiliation, same INSERT ...
// ON CONFLICT shape as the direct-add flow above, just inside a
// transaction alongside marking the request approved so the two can't
// diverge (e.g. a crash between them leaving an approved-but-unlinked
// request).
router.post("/requests/:id/approve", requireAuth, requireAccountType("hospital"), requireUnrestrictedAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const request = await client.query(
      `UPDATE hospital_affiliation_requests
       SET status = 'approved', responded_at = now()
       WHERE id = $1 AND hospital_account_id = $2 AND status = 'pending'
       RETURNING doctor_account_id`,
      [req.params.id, req.account.id]
    );
    if (request.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Request not found or already responded to." });
    }
    const affiliation = await client.query(
      `INSERT INTO hospital_affiliations (doctor_account_id, hospital_account_id)
       VALUES ($1, $2)
       ON CONFLICT (doctor_account_id, hospital_account_id) DO UPDATE
         SET revoked_at = NULL, joined_at = now()
       RETURNING id, doctor_account_id, joined_at`,
      [request.rows[0].doctor_account_id, req.account.id]
    );
    await client.query("COMMIT");
    res.json({ affiliation: affiliation.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// Declining creates no affiliation and needs no unrestricted-admin gate —
// it isn't a new commitment the way approving is, so a hospital currently
// restricted for unpaid overage can still turn away a request it doesn't
// want.
router.post("/requests/:id/decline", requireAuth, requireAccountType("hospital"), async (req, res) => {
  const result = await pool.query(
    `UPDATE hospital_affiliation_requests
     SET status = 'declined', responded_at = now()
     WHERE id = $1 AND hospital_account_id = $2 AND status = 'pending'
     RETURNING id`,
    [req.params.id, req.account.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "Request not found or already responded to." });
  res.json({ declined: true });
});

// Either side can end the affiliation — the hospital removing a doctor
// who's left, or the doctor themselves stepping away.
router.delete("/:id", requireAuth, async (req, res) => {
  const result = await pool.query(
    `UPDATE hospital_affiliations
     SET revoked_at = now()
     WHERE id = $1 AND (doctor_account_id = $2 OR hospital_account_id = $2) AND revoked_at IS NULL
     RETURNING id`,
    [req.params.id, req.account.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "Affiliation not found." });
  res.json({ revoked: true });
});

module.exports = router;
