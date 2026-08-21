const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");
const { requireAuth, requireAccountType } = require("../middleware/auth");

const router = express.Router();

// This router ROUTES wrapped encryption keys — it never sees or handles
// the underlying plaintext key. The wrapping/unwrapping happens entirely
// client-side. See schema.sql's record_key_wraps table comment and the
// technical spec §3 for the full rationale.

const assignSchema = z.object({ coAdminDoctorId: z.string().uuid() });

router.post("/assign", requireAuth, requireAccountType("individual_doctor", "hospital_doctor"), async (req, res) => {
  const parsed = assignSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "coAdminDoctorId is required." });

  await pool.query(
    `INSERT INTO co_admin_assignments (primary_doctor_id, co_admin_doctor_id)
     VALUES ($1, $2)
     ON CONFLICT (primary_doctor_id) DO UPDATE
       SET co_admin_doctor_id = EXCLUDED.co_admin_doctor_id, revoked_at = NULL, assigned_at = now()`,
    [req.account.id, parsed.data.coAdminDoctorId]
  );

  res.status(201).json({ assigned: true });
});

// Called once, at the moment a co-admin is assigned: the client wraps each
// existing patient record's key for the new co-admin and submits the
// wrapped blobs here. This is a one-time setup event, not something
// re-sent later — see technical spec §3.2 ("not re-sent — there's nothing
// to resend once a key is genuinely lost").
const submitKeyWrapSchema = z.object({
  patientRecordId: z.string().uuid(),
  wrappedKey: z.string().min(1),
});

router.post("/key-wraps", requireAuth, requireAccountType("individual_doctor", "hospital_doctor"), async (req, res) => {
  const parsed = submitKeyWrapSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid key wrap payload." });

  const assignment = await pool.query(
    `SELECT co_admin_doctor_id FROM co_admin_assignments WHERE primary_doctor_id = $1 AND revoked_at IS NULL`,
    [req.account.id]
  );
  if (assignment.rows.length === 0) {
    return res.status(400).json({ error: "No active co-admin assigned for this account." });
  }

  await pool.query(
    `INSERT INTO record_key_wraps (patient_record_id, holder_account_id, holder_role, wrapped_key)
     VALUES ($1, $2, 'co_admin_doctor', $3)
     ON CONFLICT (patient_record_id, holder_account_id) DO UPDATE SET wrapped_key = EXCLUDED.wrapped_key`,
    [parsed.data.patientRecordId, assignment.rows[0].co_admin_doctor_id, parsed.data.wrappedKey]
  );

  res.status(201).json({ stored: true });
});

// Per-patient consent decision — this is the actual access gate. If false,
// the co-admin's wrap exists only for recovery, not day-to-day access.
// Only the patient this record belongs to can grant or decline consent for
// it — verified below via patient_record_index.patient_account_id, rather
// than trusting the caller's own claim about which record they mean.
const consentSchema = z.object({
  patientRecordId: z.string().uuid(),
  consentGranted: z.boolean(),
});

router.post("/consent", requireAuth, requireAccountType("patient"), async (req, res) => {
  const parsed = consentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid consent payload." });

  const ownsRecord = await pool.query(
    `SELECT 1 FROM patient_record_index WHERE id = $1 AND patient_account_id = $2`,
    [parsed.data.patientRecordId, req.account.id]
  );
  if (ownsRecord.rows.length === 0) {
    return res.status(403).json({ error: "This record isn't linked to your account." });
  }

  const result = await pool.query(
    `UPDATE record_key_wraps
     SET consent_granted = $1, consent_recorded_at = now()
     WHERE patient_record_id = $2 AND holder_role = 'co_admin_doctor'
     RETURNING id`,
    [parsed.data.consentGranted, parsed.data.patientRecordId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "No co-admin key wrap found for this record." });
  }
  res.json({ updated: true });
});

// This doctor's current co-admin assignment, if any — lets the frontend
// show "currently assigned: Dr. X" instead of being blind between visits.
// Existed as a write-only upsert (/assign, above) with no matching read
// until now.
router.get("/my-assignment", requireAuth, requireAccountType("individual_doctor", "hospital_doctor"), async (req, res) => {
  const result = await pool.query(
    `SELECT a.co_admin_doctor_id, acc.display_name AS co_admin_doctor_name, a.assigned_at, a.revoked_at
     FROM co_admin_assignments a JOIN accounts acc ON acc.id = a.co_admin_doctor_id
     WHERE a.primary_doctor_id = $1 AND a.revoked_at IS NULL`,
    [req.account.id]
  );
  res.json({ assignment: result.rows[0] || null });
});

// Every key wrap held by the calling account — the co-admin side's
// equivalent of "which records was I given access to," which had no
// listing endpoint at all until now (only the per-record GET below,
// which is useless without already knowing a patientRecordId). Never
// reveals patient identity beyond what the primary doctor's own name
// already implies — no chart access without the consent this row itself
// tracks.
router.get("/my-wraps", requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT k.id, k.patient_record_id, k.holder_role, k.consent_granted, k.consent_recorded_at, k.created_at,
            r.primary_doctor_id, a.display_name AS primary_doctor_name
     FROM record_key_wraps k
     JOIN patient_record_index r ON r.id = k.patient_record_id
     JOIN accounts a ON a.id = r.primary_doctor_id
     WHERE k.holder_account_id = $1
     ORDER BY k.created_at DESC`,
    [req.account.id]
  );
  res.json({ wraps: result.rows });
});

// Fetch the wrapped key this account is entitled to for a given record.
// Enforces the consent gate at read time.
router.get("/key-wraps/:patientRecordId", requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT wrapped_key, holder_role, consent_granted
     FROM record_key_wraps
     WHERE patient_record_id = $1 AND holder_account_id = $2`,
    [req.params.patientRecordId, req.account.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "No key available for this account and record." });

  const row = result.rows[0];
  if (row.holder_role === "co_admin_doctor" && row.consent_granted !== true) {
    // Recovery-only wrap — not returned for normal day-to-day access.
    // A real deployment needs a separate, audited "recovery mode" flow
    // (e.g. requiring proof the primary doctor is genuinely locked out)
    // before ever releasing this. Flagged explicitly rather than silently
    // allowed here.
    return res.status(403).json({ error: "Co-admin access to this record requires patient consent, which has not been granted." });
  }

  res.json({ wrappedKey: row.wrapped_key });
});

module.exports = router;
