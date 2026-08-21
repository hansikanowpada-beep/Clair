const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");
const { requireAuth, requireAccountType } = require("../middleware/auth");

const router = express.Router();

// Doctor-to-PATIENT follow-up plans + their message thread. Deliberately
// plaintext (see schema.sql's comment on patient_followups) — the patient
// reads this directly in their own portal, same reasoning as
// care_team_instructions' plaintext diagnosis_summary. Kept short and
// plan-level; not a substitute for the doctor's own clinical record.

const DOCTOR_TYPES = ["individual_doctor", "hospital_doctor"];

async function loadFollowupForAccount(followupId, accountId) {
  const result = await pool.query(
    `SELECT * FROM patient_followups WHERE id = $1 AND (doctor_id = $2 OR patient_account_id = $2)`,
    [followupId, accountId]
  );
  return result.rows[0] || null;
}

const createSchema = z.object({
  patientAccountId: z.string().uuid().optional(),
  patientDisplayName: z.string().min(1),
  patientPhone: z.string().optional(),
  interval: z.string().min(1),
  takeaways: z.string().min(1),
  complications: z.string().optional(),
  dietPhysio: z.string().optional(),
  precautions: z.string().optional(),
  nextVisit: z.string().optional(),
});

router.post("/", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid follow-up payload.", details: parsed.error.flatten() });
  const d = parsed.data;

  const result = await pool.query(
    `INSERT INTO patient_followups
       (doctor_id, patient_account_id, patient_display_name, patient_phone, interval, takeaways, complications, diet_physio, precautions, next_visit)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [req.account.id, d.patientAccountId || null, d.patientDisplayName, d.patientPhone || null, d.interval, d.takeaways, d.complications || null, d.dietPhysio || null, d.precautions || null, d.nextVisit || null]
  );
  res.status(201).json({ followup: result.rows[0] });
});

// This doctor's own follow-up plans.
router.get("/", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM patient_followups WHERE doctor_id = $1 ORDER BY updated_at DESC`,
    [req.account.id]
  );
  res.json({ followups: result.rows });
});

// A patient's own linked follow-up plans.
router.get("/mine", requireAuth, requireAccountType("patient"), async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM patient_followups WHERE patient_account_id = $1 ORDER BY updated_at DESC`,
    [req.account.id]
  );
  res.json({ followups: result.rows });
});

router.get("/:id", requireAuth, async (req, res) => {
  const followup = await loadFollowupForAccount(req.params.id, req.account.id);
  if (!followup) return res.status(404).json({ error: "Follow-up plan not found." });
  res.json({ followup });
});

// Plan fields are doctor-authored — only the owning doctor edits them.
const updateSchema = z.object({
  interval: z.string().min(1).optional(),
  takeaways: z.string().min(1).optional(),
  complications: z.string().optional(),
  dietPhysio: z.string().optional(),
  precautions: z.string().optional(),
  nextVisit: z.string().optional(),
});

router.patch("/:id", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid update payload.", details: parsed.error.flatten() });
  const d = parsed.data;

  const result = await pool.query(
    `UPDATE patient_followups SET
       interval = COALESCE($1, interval),
       takeaways = COALESCE($2, takeaways),
       complications = COALESCE($3, complications),
       diet_physio = COALESCE($4, diet_physio),
       precautions = COALESCE($5, precautions),
       next_visit = COALESCE($6, next_visit),
       updated_at = now()
     WHERE id = $7 AND doctor_id = $8
     RETURNING *`,
    [d.interval || null, d.takeaways || null, d.complications ?? null, d.dietPhysio ?? null, d.precautions ?? null, d.nextVisit ?? null, req.params.id, req.account.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "Follow-up plan not found." });
  res.json({ followup: result.rows[0] });
});

// Message thread — either party (the owning doctor or the linked patient)
// can read and post. isAdviceLink/linkExpiresAt mirror the frontend's
// existing "share a 24h feedback link" pattern; the client builds and
// sends the link text itself, this just stores the flag/expiry alongside
// it so it's enforced consistently wherever the thread is read from.
router.get("/:id/messages", requireAuth, async (req, res) => {
  const followup = await loadFollowupForAccount(req.params.id, req.account.id);
  if (!followup) return res.status(404).json({ error: "Follow-up plan not found." });

  const result = await pool.query(
    `SELECT id, sender_role, text, is_advice_link, link_expires_at, sent_at
     FROM patient_followup_messages WHERE followup_id = $1 ORDER BY sent_at ASC`,
    [req.params.id]
  );
  res.json({ messages: result.rows });
});

const messageSchema = z.object({
  text: z.string().min(1),
  isAdviceLink: z.boolean().optional(),
  linkExpiresAt: z.string().datetime().optional(),
});

router.post("/:id/messages", requireAuth, async (req, res) => {
  const followup = await loadFollowupForAccount(req.params.id, req.account.id);
  if (!followup) return res.status(404).json({ error: "Follow-up plan not found." });

  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid message payload.", details: parsed.error.flatten() });

  // Sender role is derived from which side of the plan the caller actually
  // is, never trusted from the request body.
  const senderRole = followup.doctor_id === req.account.id ? "doctor" : "patient";

  const result = await pool.query(
    `INSERT INTO patient_followup_messages (followup_id, sender_role, sender_account_id, text, is_advice_link, link_expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, sender_role, text, is_advice_link, link_expires_at, sent_at`,
    [req.params.id, senderRole, req.account.id, parsed.data.text, parsed.data.isAdviceLink || false, parsed.data.linkExpiresAt || null]
  );
  res.status(201).json({ message: result.rows[0] });
});

module.exports = router;
