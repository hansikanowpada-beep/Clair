const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");
const { requireAuth, requireAccountType } = require("../middleware/auth");
const { requireUnrestrictedAdmin } = require("../middleware/adminRestriction");

const router = express.Router();

// Links a doctor account to a hospital account — supports the dual-
// practice pattern (a doctor working hospital shifts AND running their
// own private clinic) without forcing two separate logins. See
// schema.sql's hospital_affiliations comment and routes/records.js's
// billingContextId handling for how a note picks which plan it counts
// against once affiliated.

// Hospital adds a doctor by their account ID (the doctor must already
// have an account — this doesn't create one). No accept/reject flow yet:
// the hospital administrator is trusted to only add doctors who actually
// work there, same trust level as care-team instruction creation
// elsewhere in this backend. Revisit if abuse becomes a real problem.
const addSchema = z.object({ doctorAccountId: z.string().uuid() });

router.post("/", requireAuth, requireAccountType("hospital"), requireUnrestrictedAdmin, async (req, res) => {
  const parsed = addSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "doctorAccountId is required." });

  const doctorExists = await pool.query(
    `SELECT 1 FROM accounts WHERE id = $1 AND account_type IN ('individual_doctor', 'hospital_doctor') AND deactivated_at IS NULL`,
    [parsed.data.doctorAccountId]
  );
  if (doctorExists.rows.length === 0) {
    return res.status(404).json({ error: "Doctor account not found." });
  }

  const result = await pool.query(
    `INSERT INTO hospital_affiliations (doctor_account_id, hospital_account_id)
     VALUES ($1, $2)
     ON CONFLICT (doctor_account_id, hospital_account_id) DO UPDATE
       SET revoked_at = NULL, joined_at = now()
     RETURNING id, doctor_account_id, joined_at`,
    [parsed.data.doctorAccountId, req.account.id]
  );
  res.status(201).json({ affiliation: result.rows[0] });
});

// Hospital's own view of currently-affiliated doctors.
router.get("/", requireAuth, requireAccountType("hospital"), async (req, res) => {
  const result = await pool.query(
    `SELECT a.id, d.display_name, d.specialty, a.joined_at
     FROM hospital_affiliations a
     JOIN accounts d ON d.id = a.doctor_account_id
     WHERE a.hospital_account_id = $1 AND a.revoked_at IS NULL
     ORDER BY a.joined_at DESC`,
    [req.account.id]
  );
  res.json({ affiliations: result.rows });
});

// A doctor's own view of which hospitals they're currently affiliated
// with — powers the "which hat am I wearing" picker when creating a note.
router.get("/mine", requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT a.id, h.id AS hospital_account_id, h.display_name AS hospital_name, a.joined_at
     FROM hospital_affiliations a
     JOIN accounts h ON h.id = a.hospital_account_id
     WHERE a.doctor_account_id = $1 AND a.revoked_at IS NULL
     ORDER BY a.joined_at DESC`,
    [req.account.id]
  );
  res.json({ affiliations: result.rows });
});

// Either side can end the affiliation — the hospital removing a doctor
// who's left, or the doctor themselves stepping away.
router.delete("/:id", requireAuth, async (req, res) => {
  const result = await pool.query(
    `UPDATE hospital_affiliations
     SET revoked_at = now()
     WHERE id = $1 AND (doctor_account_id = $2 OR hospital_account_id = $2) AND revoked_at IS NULL
     RETURNING id`,
    [req.params.id, req.account.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "Affiliation not found." });
  res.json({ revoked: true });
});

module.exports = router;
