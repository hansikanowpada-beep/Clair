const pool = require("../db/pool");

// Reusable check: is this doctor currently, actively affiliated with this
// hospital? Used wherever a doctor claims to be acting "as hospital
// staff" (currently just routes/records.js's billingContextId handling)
// so that claim is verified against a real affiliation row, not just
// trusted from the request body.
async function hasActiveAffiliation(doctorAccountId, hospitalAccountId) {
  const result = await pool.query(
    `SELECT 1 FROM hospital_affiliations
     WHERE doctor_account_id = $1 AND hospital_account_id = $2 AND revoked_at IS NULL`,
    [doctorAccountId, hospitalAccountId]
  );
  return result.rows.length > 0;
}

module.exports = { hasActiveAffiliation };
