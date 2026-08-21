const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");
const { requireAuth, requireAccountType } = require("../middleware/auth");
const notifications = require("../services/notifications");

const router = express.Router();

// Care team member accounts get a scoped instruction queue ONLY — never
// chart or key access (see schema.sql's care_team_instructions comment and
// technical spec §3.4). This is deliberately task-scoped and does NOT
// require patient consent, unlike co-admin access.

const DOCTOR_TYPES = ["individual_doctor", "hospital_doctor"];

const createSchema = z.object({
  toCareTeamId: z.string().uuid(),
  patientRecordId: z.string().uuid(),
  patientDisplayName: z.string().min(1),
  diagnosisSummary: z.string().max(500).optional(),
  bedNumber: z.string().max(50).optional(),
  instructionText: z.string().min(1).max(2000),
});

router.post("/", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid instruction payload.", details: parsed.error.flatten() });
  }
  const { toCareTeamId, patientRecordId, patientDisplayName, diagnosisSummary, bedNumber, instructionText } = parsed.data;

  // Confirm the sending doctor actually owns this patient record — a care
  // team instruction referencing someone else's patient would leak the
  // fact that record exists, even without exposing its content.
  const owns = await pool.query(
    `SELECT 1 FROM patient_record_index WHERE id = $1 AND primary_doctor_id = $2`,
    [patientRecordId, req.account.id]
  );
  if (owns.rows.length === 0) {
    return res.status(403).json({ error: "You don't have access to this patient record." });
  }

  const result = await pool.query(
    `INSERT INTO care_team_instructions
       (from_doctor_id, to_care_team_id, patient_record_id, patient_display_name, diagnosis_summary, bed_number, instruction_text)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, to_care_team_id, patient_display_name, diagnosis_summary, bed_number, instruction_text, created_at`,
    [req.account.id, toCareTeamId, patientRecordId, patientDisplayName, diagnosisSummary || null, bedNumber || null, instructionText]
  );

  // Real delivery isn't wired up yet (see services/notifications.js), but
  // the queue entry itself is now genuine — the recipient will see this
  // via GET /api/notifications once they poll, not just via GET
  // /api/care-team/pending.
  await notifications.enqueue(toCareTeamId, "care_team_instruction_created", {
    instructionId: result.rows[0].id,
    patientDisplayName,
  });

  res.status(201).json({ instruction: result.rows[0] });
});

// A care team member's own pending (unacknowledged) instructions.
router.get("/pending", requireAuth, requireAccountType("care_team_member"), async (req, res) => {
  const result = await pool.query(
    `SELECT id, from_doctor_id, patient_display_name, diagnosis_summary, bed_number, instruction_text, created_at
     FROM care_team_instructions
     WHERE to_care_team_id = $1 AND acknowledged_at IS NULL
     ORDER BY created_at ASC`,
    [req.account.id]
  );
  res.json({ instructions: result.rows });
});

// Care team member taps "OK" — clears the instruction from their queue.
// Logs the acknowledgment (acknowledged_at) and queues a notification to
// the primary doctor — real push/email delivery still isn't wired up (see
// services/notifications.js), but the queue entry itself is genuine now.
router.post("/:id/acknowledge", requireAuth, requireAccountType("care_team_member"), async (req, res) => {
  const result = await pool.query(
    `UPDATE care_team_instructions
     SET acknowledged_at = now()
     WHERE id = $1 AND to_care_team_id = $2 AND acknowledged_at IS NULL
     RETURNING id, acknowledged_at, from_doctor_id`,
    [req.params.id, req.account.id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Instruction not found or already acknowledged." });
  }
  await notifications.enqueue(result.rows[0].from_doctor_id, "care_team_instruction_acknowledged", {
    instructionId: result.rows[0].id,
  });
  // Co-admin notification, if one is assigned for this patient, isn't
  // included here — that would need a lookup into co_admin_assignments to
  // find who to notify, not just the from_doctor_id already on hand.
  // Flagged rather than silently half-done.
  res.json({ acknowledged: true, instruction: result.rows[0] });
});

// A doctor's own view of instructions they've sent — useful for confirming
// something was actually acknowledged, not just sent.
router.get("/sent", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const result = await pool.query(
    `SELECT id, to_care_team_id, patient_display_name, instruction_text, acknowledged_at, created_at
     FROM care_team_instructions
     WHERE from_doctor_id = $1
     ORDER BY created_at DESC`,
    [req.account.id]
  );
  res.json({ instructions: result.rows });
});

module.exports = router;
