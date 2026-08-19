const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");
const { requireAuth, requireAccountType } = require("../middleware/auth");

const router = express.Router();

// Backs up the patient's emergency profile as an opaque encrypted blob —
// see schema.sql's comment above emergency_profiles for the full design
// rationale. This router never sees plaintext and has no way to decrypt
// what it stores; it exists purely to make the blob durable across device
// loss/replacement and to sync it to a new device. The actual emergency
// read is designed to work fully offline once a device already has the
// blob and its local key cached — this backend is not in that critical
// path, on purpose.

const putSchema = z.object({
  encryptedBlob: z.string().min(1),
});

router.put("/", requireAuth, requireAccountType("patient"), async (req, res) => {
  const parsed = putSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "encryptedBlob is required." });

  const result = await pool.query(
    `INSERT INTO emergency_profiles (patient_account_id, encrypted_blob, blob_version, updated_at)
     VALUES ($1, $2, 1, now())
     ON CONFLICT (patient_account_id) DO UPDATE
       SET encrypted_blob = $2, blob_version = emergency_profiles.blob_version + 1, updated_at = now()
     RETURNING patient_account_id, blob_version, updated_at`,
    [req.account.id, parsed.data.encryptedBlob]
  );
  res.json({ profile: result.rows[0] });
});

// The patient's own retrieval — for syncing onto a new device, or an
// explicit re-fetch. Returns the opaque blob as-is; decryption happens
// entirely client-side.
router.get("/", requireAuth, requireAccountType("patient"), async (req, res) => {
  const result = await pool.query(
    `SELECT encrypted_blob, blob_version, updated_at FROM emergency_profiles WHERE patient_account_id = $1`,
    [req.account.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "No emergency profile set up yet." });
  res.json({ profile: result.rows[0] });
});

// Client-reported audit log for an emergency unlock that already happened
// on-device, possibly fully offline — see schema.sql's comment on
// emergency_access_events for why this is "report after the fact" rather
// than a real-time gate. `reason` is now locked to the exact 4 options
// the frontend's emergency-access dropdown already offers (2026-08-18
// decision: keep the existing 4, don't add more) — this closes a real
// gap that existed before: the backend previously accepted ANY string,
// so a modified or different client could have sent something outside
// what the UI actually shows.
//
// Scoped to the patient's own account only — patientAccountId is derived
// from the authenticated caller, never trusted from the request body.
// (An earlier version of this endpoint accepted an arbitrary
// patientAccountId in the body without checking it belonged to the
// caller, which would have let any authenticated account write fake
// audit entries against someone else's emergency profile — fixed before
// shipping, not left as a known issue.)
const EMERGENCY_ACCESS_REASONS = ["Found unresponsive", "Visible injury", "Confused / disoriented", "Other medical emergency"];

const accessLogSchema = z.object({
  reason: z.enum(EMERGENCY_ACCESS_REASONS),
  accessedAt: z.string().datetime(),
});

router.post("/access-log", requireAuth, requireAccountType("patient"), async (req, res) => {
  const parsed = accessLogSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid access-log payload.", details: parsed.error.flatten() });
  }

  const result = await pool.query(
    `INSERT INTO emergency_access_events (patient_account_id, reason, accessed_at)
     VALUES ($1, $2, $3)
     RETURNING id, reported_at`,
    [req.account.id, parsed.data.reason, parsed.data.accessedAt]
  );
  res.status(201).json({ logged: true, event: result.rows[0] });
});

// The patient's own view of their access history — powers a "see who's
// unlocked this and why" screen, which is itself a misuse deterrent even
// without real-time blocking.
router.get("/access-log", requireAuth, requireAccountType("patient"), async (req, res) => {
  const result = await pool.query(
    `SELECT id, reason, accessed_at, reported_at FROM emergency_access_events
     WHERE patient_account_id = $1 ORDER BY accessed_at DESC LIMIT 50`,
    [req.account.id]
  );
  res.json({ events: result.rows });
});

module.exports = router;
