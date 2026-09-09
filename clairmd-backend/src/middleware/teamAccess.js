const pool = require("../db/pool");

// Fixed allowlist of team_memberships' access_* columns — domainColumn is
// string-interpolated into SQL below (Postgres has no way to parameterize
// a column name), so this guards against ever doing that with anything
// but one of these five literals, even if a future call site's argument
// stops being a hardcoded string.
const ACCESS_COLUMNS = new Set(["access_clinical_record", "access_inventory", "access_lab_reports"]);

// Gates a route by team_memberships access, alongside (not instead of) the
// resource's own doctor-ownership check: the resource's owning doctor
// always has full access to their own data; anyone else needs an active,
// non-revoked team_memberships row for that doctor with the named domain
// flag set. domainColumn must be one of team_memberships' access_* columns
// — callers pass a literal, never user input, so string-interpolating it
// into the query is safe.
//
// Usage: attach req.teamAccess = { doctorAccountId } so the route knows
// whose data to operate on. doctorAccountId is optional on the request —
// omitting it means "acting for myself" (the common case: a doctor's own
// existing calls don't need to change), so it defaults to req.account.id.
// A team member acting on a DIFFERENT doctor's data must pass it
// explicitly (params/body/query), which is then checked against a real
// membership row below.
function requireTeamAccess(domainColumn) {
  if (!ACCESS_COLUMNS.has(domainColumn)) {
    throw new Error(`requireTeamAccess: "${domainColumn}" is not a recognized access domain.`);
  }
  return async (req, res, next) => {
    const doctorAccountId = req.params.doctorAccountId || req.body.doctorAccountId || req.query.doctorAccountId || req.account.id;
    if (req.account.id === doctorAccountId) {
      req.teamAccess = { doctorAccountId, role: null, viaMembership: false };
      return next();
    }

    const result = await pool.query(
      `SELECT role FROM team_memberships
       WHERE doctor_account_id = $1 AND member_account_id = $2 AND revoked_at IS NULL AND ${domainColumn} = true`,
      [doctorAccountId, req.account.id]
    );
    if (result.rows.length === 0) {
      return res.status(403).json({ error: "You don't have team access to this doctor's data for this action." });
    }
    req.teamAccess = { doctorAccountId, role: result.rows[0].role, viaMembership: true };
    next();
  };
}

module.exports = { requireTeamAccess };
