const express = require("express");
const pool = require("../db/pool");
const { requireAuth, requireAccountType } = require("../middleware/auth");

const router = express.Router();

// Patient-facing routes. A patient can see which of their records exist as
// pointers (never the clinical content itself — that's decrypted client-
// side using their own key wrap, same as everywhere else in this backend)
// and which co-admin consent decisions are waiting on them.

router.get("/records", requireAuth, requireAccountType("patient"), async (req, res) => {
  const result = await pool.query(
    `SELECT r.id, r.primary_doctor_id, a.display_name AS primary_doctor_name, r.created_at, r.updated_at
     FROM patient_record_index r
     JOIN accounts a ON a.id = r.primary_doctor_id
     WHERE r.patient_account_id = $1
     ORDER BY r.updated_at DESC`,
    [req.account.id]
  );
  res.json({ records: result.rows });
});

// Co-admin consent decisions still awaiting this patient's response —
// powers the "a doctor wants co-admin access to your record" prompt.
router.get("/consent-requests", requireAuth, requireAccountType("patient"), async (req, res) => {
  const result = await pool.query(
    `SELECT k.id, k.patient_record_id, k.consent_granted, k.created_at,
            a.display_name AS co_admin_doctor_name
     FROM record_key_wraps k
     JOIN patient_record_index r ON r.id = k.patient_record_id
     JOIN accounts a ON a.id = k.holder_account_id
     WHERE r.patient_account_id = $1
       AND k.holder_role = 'co_admin_doctor'
       AND k.consent_granted IS NULL
     ORDER BY k.created_at DESC`,
    [req.account.id]
  );
  res.json({ pendingConsentRequests: result.rows });
});

module.exports = router;
