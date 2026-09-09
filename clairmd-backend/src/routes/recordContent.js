const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { roleHasClinicalWriteAccess } = require("../services/teamRoles");

const router = express.Router();

// Syncs a patient_record_index row's actual clinical content — OPD/ICU-Ward
// note text, including whatever the client bundled into it (history,
// vitals, examination findings, diagnosis/plan, etc.) — as an opaque
// encrypted blob. This is a deliberately separate router from records.js,
// which explicitly documents that it must never accept a body field like
// "diagnosis", "notes", or "hpi": that invariant is about PLAINTEXT
// clinical content, and stays true here too. Every route below accepts
// only ciphertext (encryptedBlob) and this backend has no way to decrypt
// it — same trust model as routes/emergencyProfile.js and
// record_key_wraps. See schema.sql's comment on patient_record_content
// for the full design rationale, including why this is an ADDITIONAL
// sync path alongside the doctor's own Drive copy, not a replacement.
//
// No tier/usage check on either route below, on purpose — quota is
// enforced once, at record CREATION time (routes/records.js POST /).
// Syncing/re-syncing a record's content is "editing an existing record",
// which this backend's product decision has never restricted, the same
// way records.js's PATCH (updating drive_file_id) isn't gated either.

const putSchema = z.object({
  encryptedBlob: z.string().min(1),
});

// The record's primary doctor can always write its content. So can a team
// member with access_clinical_record granted AND a role that's allowed to
// actually author clinical content (today: only 'duty_doctor' — see
// services/teamRoles.js's roleHasClinicalWriteAccess). Co-admins and
// patients only ever read via their key wrap; this is the one write path,
// and it deliberately checks the LIVE membership row each time (not just
// "does a key wrap exist," which is how GET below works) — access_clinical_
// record or the role itself could have changed since the wrap was issued.
router.put("/:recordId", requireAuth, async (req, res) => {
  const parsed = putSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "encryptedBlob is required." });

  const record = await pool.query(
    `SELECT primary_doctor_id FROM patient_record_index WHERE id = $1`,
    [req.params.recordId]
  );
  if (record.rows.length === 0) {
    return res.status(404).json({ error: "Record not found." });
  }
  const primaryDoctorId = record.rows[0].primary_doctor_id;

  let allowed = primaryDoctorId === req.account.id;
  if (!allowed) {
    const membership = await pool.query(
      `SELECT role FROM team_memberships
       WHERE doctor_account_id = $1 AND member_account_id = $2 AND revoked_at IS NULL AND access_clinical_record = true`,
      [primaryDoctorId, req.account.id]
    );
    allowed = membership.rows.length > 0 && roleHasClinicalWriteAccess(membership.rows[0].role);
  }
  // 404 rather than 403 — same "don't confirm this record exists to
  // someone with no legitimate reason to know" reasoning as everywhere
  // else in this file.
  if (!allowed) {
    return res.status(404).json({ error: "Record not found." });
  }

  const result = await pool.query(
    `INSERT INTO patient_record_content (patient_record_id, encrypted_blob, blob_version, updated_at)
     VALUES ($1, $2, 1, now())
     ON CONFLICT (patient_record_id) DO UPDATE
       SET encrypted_blob = $2, blob_version = patient_record_content.blob_version + 1, updated_at = now()
     RETURNING patient_record_id, blob_version, updated_at`,
    [req.params.recordId, parsed.data.encryptedBlob]
  );
  res.json({ content: result.rows[0] });
});

// Readable by the primary doctor, or by anyone holding a key wrap for this
// record (same access predicate as records.js's GET /:id) — actual
// decryption still requires that wrap, fetched separately and gated by
// consent for co-admins (see routes/coadmin.js).
router.get("/:recordId", requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT c.patient_record_id, c.encrypted_blob, c.blob_version, c.updated_at
     FROM patient_record_content c
     JOIN patient_record_index r ON r.id = c.patient_record_id
     WHERE c.patient_record_id = $1
       AND (
         r.primary_doctor_id = $2
         OR EXISTS (SELECT 1 FROM record_key_wraps k WHERE k.patient_record_id = r.id AND k.holder_account_id = $2)
       )`,
    [req.params.recordId, req.account.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "No content synced for this record yet." });
  res.json({ content: result.rows[0] });
});

module.exports = router;
