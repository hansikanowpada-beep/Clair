const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

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

// Only the record's primary doctor can write its content — co-admins and
// patients read via their key wrap, but writing stays with whoever is
// actually seeing the patient and authoring the note.
router.put("/:recordId", requireAuth, async (req, res) => {
  const parsed = putSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "encryptedBlob is required." });

  const owns = await pool.query(
    `SELECT 1 FROM patient_record_index WHERE id = $1 AND primary_doctor_id = $2`,
    [req.params.recordId, req.account.id]
  );
  if (owns.rows.length === 0) {
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
