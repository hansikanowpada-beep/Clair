const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");
const { requireAuth, requireAccountType } = require("../middleware/auth");
const notifications = require("../services/notifications");

const router = express.Router();

// Referral rows carry ONLY routing metadata (see schema.sql) — the
// receiving doctor pulls the actual patient context in-app after opening
// the referral, using their own key-wrap access to the record. Nothing
// clinical rides in a referral row or, eventually, in any OS-level push
// notification payload built from it.

const DOCTOR_TYPES = ["individual_doctor", "hospital_doctor"];

const createSchema = z.object({
  toDoctorId: z.string().uuid(),
  patientRecordId: z.string().uuid(),
  reasonSummary: z.string().max(300).optional(),
});

router.post("/", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid referral payload.", details: parsed.error.flatten() });
  }
  const { toDoctorId, patientRecordId, reasonSummary } = parsed.data;

  if (toDoctorId === req.account.id) {
    return res.status(400).json({ error: "Cannot refer a patient to yourself." });
  }

  const owns = await pool.query(
    `SELECT 1 FROM patient_record_index WHERE id = $1 AND primary_doctor_id = $2`,
    [patientRecordId, req.account.id]
  );
  if (owns.rows.length === 0) {
    return res.status(403).json({ error: "You don't have access to this patient record." });
  }

  const recipientExists = await pool.query(
    `SELECT 1 FROM accounts WHERE id = $1 AND account_type IN ('individual_doctor', 'hospital_doctor') AND deactivated_at IS NULL`,
    [toDoctorId]
  );
  if (recipientExists.rows.length === 0) {
    return res.status(404).json({ error: "Recipient doctor not found." });
  }

  const result = await pool.query(
    `INSERT INTO referrals (from_doctor_id, to_doctor_id, patient_record_id, reason_summary)
     VALUES ($1, $2, $3, $4)
     RETURNING id, to_doctor_id, patient_record_id, reason_summary, status, created_at`,
    [req.account.id, toDoctorId, patientRecordId, reasonSummary || null]
  );

  // Real delivery isn't wired up yet (see services/notifications.js), but
  // the queue entry is genuine — visible via GET /api/notifications.
  await notifications.enqueue(toDoctorId, "referral_created", {
    referralId: result.rows[0].id,
    fromDoctorId: req.account.id,
  });

  res.status(201).json({ referral: result.rows[0] });
});

// Referrals sent TO the authenticated doctor, optionally filtered by
// status (e.g. ?status=sent to see only ones needing a response).
const statusQuerySchema = z.enum(["sent", "acknowledged", "declined"]).optional();

router.get("/inbox", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const statusParsed = statusQuerySchema.safeParse(req.query.status);
  const status = statusParsed.success ? statusParsed.data : undefined;

  const result = await pool.query(
    status
      ? `SELECT id, from_doctor_id, patient_record_id, reason_summary, status, created_at, responded_at
         FROM referrals WHERE to_doctor_id = $1 AND status = $2 ORDER BY created_at DESC`
      : `SELECT id, from_doctor_id, patient_record_id, reason_summary, status, created_at, responded_at
         FROM referrals WHERE to_doctor_id = $1 ORDER BY created_at DESC`,
    status ? [req.account.id, status] : [req.account.id]
  );
  res.json({ referrals: result.rows });
});

// Referrals this doctor has sent, so they can track whether they were
// picked up.
router.get("/sent", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const result = await pool.query(
    `SELECT id, to_doctor_id, patient_record_id, reason_summary, status, created_at, responded_at
     FROM referrals WHERE from_doctor_id = $1 ORDER BY created_at DESC`,
    [req.account.id]
  );
  res.json({ referrals: result.rows });
});

// Recipient acknowledges or declines. Once responded to, a referral is not
// reopened here — a new referral should be sent if care continues to
// change hands, so the audit trail (who was asked, when, what they said)
// stays intact rather than being edited after the fact.
const respondSchema = z.object({ decision: z.enum(["acknowledged", "declined"]) });

router.post("/:id/respond", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const parsed = respondSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "decision must be 'acknowledged' or 'declined'." });

  const result = await pool.query(
    `UPDATE referrals
     SET status = $1, responded_at = now()
     WHERE id = $2 AND to_doctor_id = $3 AND status = 'sent'
     RETURNING id, status, responded_at, from_doctor_id`,
    [parsed.data.decision, req.params.id, req.account.id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Referral not found or already responded to." });
  }
  await notifications.enqueue(result.rows[0].from_doctor_id, "referral_responded", {
    referralId: result.rows[0].id,
    status: result.rows[0].status,
  });
  res.json({ referral: result.rows[0] });
});

module.exports = router;
