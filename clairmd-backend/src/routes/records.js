const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");
const { requireAuth, requireAccountType } = require("../middleware/auth");
const { checkNoteCreationAllowed, incrementNoteUsage, getUsageStatus } = require("../services/tierAccess");

const router = express.Router();

// This router manages ONLY the pointer/index row (see patient_record_index
// in schema.sql) — the drive_file_id column, which points at an encrypted
// file in the doctor's own Google Drive. The actual encrypted upload/
// download happens client-side, directly against the Drive API, using the
// access token from the /drive OAuth flow. This backend never sees the
// clinical content itself, and no route below should ever accept a body
// field like "diagnosis", "notes", or "hpi" — if a future change needs
// one, that's a sign it belongs in the client-side encrypted payload
// instead, not here.

const DOCTOR_TYPES = ["individual_doctor"];

// Real enforcement — see services/tierAccess.js: OPD and ICU/Ward notes
// share one combined monthly quota per doctor (10/month free, 100/month
// basic, unlimited elite). Every note always bills against the doctor who
// created it — there's no more separate "hospital billing context" to
// opt into (hospital accounts don't exist). Reading and editing
// already-existing records is NEVER affected by any of this — GET and
// PATCH below have no tier/usage check at all, on purpose, always.
const createSchema = z.object({
  driveFileId: z.string().min(1),
  patientAccountId: z.string().uuid().optional(),
  noteType: z.enum(["icu_ward", "opd"]),
});

router.post("/", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid record payload.", details: parsed.error.flatten() });
  }
  const { driveFileId, patientAccountId, noteType } = parsed.data;

  const check = await checkNoteCreationAllowed(req.account.id, noteType);
  if (!check.allowed) {
    const tierLabel = { free: "Free", basic: "Basic", elite: "Elite" }[check.planTier] || check.planTier;
    return res.status(403).json({ error: `${tierLabel} plan limit reached: ${check.limit} notes this month.`, usage: check });
  }

  const result = await pool.query(
    `INSERT INTO patient_record_index (primary_doctor_id, patient_account_id, drive_file_id)
     VALUES ($1, $2, $3)
     RETURNING id, primary_doctor_id, patient_account_id, drive_file_id, created_at, updated_at`,
    [req.account.id, patientAccountId || null, driveFileId]
  );

  await incrementNoteUsage(req.account.id, noteType);

  res.status(201).json({ record: result.rows[0] });
});

// List this doctor's own record pointers.
router.get("/", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const result = await pool.query(
    `SELECT id, patient_account_id, drive_file_id, created_at, updated_at
     FROM patient_record_index WHERE primary_doctor_id = $1 ORDER BY updated_at DESC`,
    [req.account.id]
  );
  res.json({ records: result.rows });
});

// Fetch one record pointer — always allowed regardless of tier/usage.
// Accessible to the primary doctor, or to a co-admin/patient who holds a
// key wrap for it (existence of a wrap is the access signal — actual
// decryption still goes through /coadmin/key-wraps and its own consent
// gate).
router.get("/:id", requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT r.id, r.primary_doctor_id, r.patient_account_id, r.drive_file_id, r.created_at, r.updated_at
     FROM patient_record_index r
     WHERE r.id = $1
       AND (
         r.primary_doctor_id = $2
         OR EXISTS (SELECT 1 FROM record_key_wraps k WHERE k.patient_record_id = r.id AND k.holder_account_id = $2)
       )`,
    [req.params.id, req.account.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "Record not found." });
  res.json({ record: result.rows[0] });
});

// Update the pointer after a re-save — always allowed regardless of tier/
// usage, per the product decision that editing existing records is never
// restricted, only creating new ones is.
const updateSchema = z.object({ driveFileId: z.string().min(1) });

router.patch("/:id", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "driveFileId is required." });

  const result = await pool.query(
    `UPDATE patient_record_index SET drive_file_id = $1, updated_at = now()
     WHERE id = $2 AND primary_doctor_id = $3
     RETURNING id, drive_file_id, updated_at`,
    [parsed.data.driveFileId, req.params.id, req.account.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "Record not found." });
  res.json({ record: result.rows[0] });
});

// Deletes the pointer row only — this does NOT delete the underlying
// encrypted file from the doctor's Drive (that stays fully under the
// doctor's own Drive account and lifecycle, per the ownership model in the
// technical spec). Note this cascades to record_key_wraps, care_team_
// instructions, and referrals tied to this record (see schema.sql's
// ON DELETE CASCADE) — those are intentionally cleaned up together, but
// worth knowing before wiring a "delete" button to this in the client.
router.delete("/:id", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const result = await pool.query(
    `DELETE FROM patient_record_index WHERE id = $1 AND primary_doctor_id = $2 RETURNING id`,
    [req.params.id, req.account.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "Record not found." });
  res.json({ deleted: true });
});

// This doctor's current usage against their combined monthly quota,
// standalone — powers a status banner (e.g. "8/10 notes used this month")
// before they even start a new encounter.
router.get("/usage/status", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const usage = await getUsageStatus(req.account.id);
  res.json(usage);
});

module.exports = router;
