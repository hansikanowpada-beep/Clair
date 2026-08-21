const pool = require("../db/pool");

// Gates ADMINISTRATIVE features only for a hospital with unresolved
// overage billing — adding doctors, care-team management, inventory
// (once it has a backend), dashboards. Deliberately does NOT gate:
// reading or editing existing patient records (never, under any
// circumstances — see routes/records.js's GET/PATCH, which have no tier
// or restriction check at all, on purpose), or creating new notes (an
// overage note still gets created — see tierAccess.js — this middleware
// only affects the administrative surface, not patient care).
//
// Apply this to a route with the hospital account as req.account (i.e.
// the hospital itself is calling, not a doctor affiliated with it) —
// currently used on hospital-affiliation creation (adding a doctor).
async function requireUnrestrictedAdmin(req, res, next) {
  const result = await pool.query(`SELECT admin_restricted_at FROM accounts WHERE id = $1`, [req.account.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: "Account not found." });

  if (result.rows[0].admin_restricted_at) {
    return res.status(402).json({
      error: "This hospital account has unresolved overage billing. Administrative features are paused until it's resolved — patient records remain fully accessible.",
      restrictedSince: result.rows[0].admin_restricted_at,
    });
  }
  next();
}

module.exports = { requireUnrestrictedAdmin };
