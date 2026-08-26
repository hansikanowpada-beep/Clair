const express = require("express");
const bcrypt = require("bcrypt");
const { z } = require("zod");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// DPDP data-subject rights, scoped to what this platform database actually
// holds — which, by design, is metadata only (see schema.sql). Clinical
// content lives encrypted in the doctor's own Google Drive and was never
// under this platform's control, so a request here can't reach it, and
// this file should never be extended to pretend otherwise. A patient
// wanting their clinical record deleted needs to go through their doctor's
// own Drive, not this backend.
//
// What's built: a full read-only export of platform-held data ("right to
// access"), and account deactivation (soft delete — sets deactivated_at,
// matching the column that already gates login).
//
// What's NOT built, on purpose rather than by oversight: permanent/hard
// erasure. Deciding how long a deactivated account's metadata should be
// retained before real deletion is a legal/business call (medical-record
// retention rules vary, and DPDP itself allows retention for legal
// compliance purposes) — not something to invent silently here. Flag this
// to whoever owns compliance before promising "permanently deleted"
// anywhere in the product.

router.get("/export", requireAuth, async (req, res) => {
  const accountId = req.account.id;

  const [account, driveConnections, recordIndex, careTeamSent, careTeamReceived, referralsSent, referralsReceived, billing] =
    await Promise.all([
      pool.query(
        `SELECT id, account_type, email, phone, display_name, specialty, license_number,
                license_verified_at, plan_tier, two_factor_enabled, created_at, updated_at
         FROM accounts WHERE id = $1`,
        [accountId]
      ),
      pool.query(
        `SELECT id, drive_account_email, app_folder_id, connected_at, revoked_at FROM drive_connections WHERE account_id = $1`,
        [accountId]
      ),
      pool.query(
        `SELECT id, primary_doctor_id, patient_account_id, drive_file_id, created_at, updated_at
         FROM patient_record_index WHERE primary_doctor_id = $1 OR patient_account_id = $1`,
        [accountId]
      ),
      pool.query(
        `SELECT id, to_care_team_id, patient_display_name, instruction_text, acknowledged_at, created_at
         FROM care_team_instructions WHERE from_doctor_id = $1`,
        [accountId]
      ),
      pool.query(
        `SELECT id, from_doctor_id, patient_display_name, instruction_text, acknowledged_at, created_at
         FROM care_team_instructions WHERE to_care_team_id = $1`,
        [accountId]
      ),
      pool.query(
        `SELECT id, to_doctor_id, reason_summary, status, created_at, responded_at FROM referrals WHERE from_doctor_id = $1`,
        [accountId]
      ),
      pool.query(
        `SELECT id, from_doctor_id, reason_summary, status, created_at, responded_at FROM referrals WHERE to_doctor_id = $1`,
        [accountId]
      ),
      pool.query(
        `SELECT id, plan_tier, amount_paise, payment_reference, occurred_at FROM billing_events WHERE account_id = $1`,
        [accountId]
      ),
    ]);

  if (account.rows.length === 0) return res.status(404).json({ error: "Account not found." });

  res.json({
    exportedAt: new Date().toISOString(),
    note: "This export covers everything this platform's database holds about your account. It does not include clinical record content, which is encrypted and stored in your own Google Drive, outside this platform's access.",
    account: account.rows[0],
    driveConnection: driveConnections.rows[0] || null,
    patientRecordIndexEntries: recordIndex.rows,
    careTeamInstructionsSent: careTeamSent.rows,
    careTeamInstructionsReceived: careTeamReceived.rows,
    referralsSent: referralsSent.rows,
    referralsReceived: referralsReceived.rows,
    billingHistory: billing.rows,
  });
});

// Soft-delete. Requires the current password as confirmation, since this
// is a destructive, hard-to-reverse-in-the-UI action even though the row
// itself isn't physically deleted.
const deactivateSchema = z.object({ password: z.string().min(1) });

router.post("/deactivate", requireAuth, async (req, res) => {
  const parsed = deactivateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Current password is required to deactivate your account." });

  const result = await pool.query(`SELECT password_hash FROM accounts WHERE id = $1`, [req.account.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: "Account not found." });

  const passwordMatches = await bcrypt.compare(parsed.data.password, result.rows[0].password_hash);
  if (!passwordMatches) return res.status(401).json({ error: "Incorrect password." });

  await pool.query(`UPDATE accounts SET deactivated_at = now(), updated_at = now() WHERE id = $1`, [req.account.id]);

  // Doctors: this does NOT touch their Drive-held clinical records, and
  // does NOT reassign their patients — the mandatory "transfer or archive
  // patients" offboarding checklist mentioned in the product design is a
  // separate flow that should run BEFORE this, not something this endpoint
  // enforces on its own. Flagged rather than silently assumed handled.
  res.json({
    deactivated: true,
    note: "Your account is deactivated and you'll be signed out. This does not delete or affect any clinical records stored in your own Google Drive.",
  });
});

module.exports = router;
