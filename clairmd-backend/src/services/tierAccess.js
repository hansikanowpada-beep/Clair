const pool = require("../db/pool");

// Works against the calling doctor's own account — there's no more
// "billing context" concept (that only ever existed to let a note bill
// against a hospital account instead of the doctor; hospital accounts are
// gone). Every note bills against the doctor who created it, always.
//
// Individual-doctor limits (2026-09-09 revision): OPD and ICU/Ward notes
// now share ONE combined monthly quota per doctor — ICU/Ward used to be
// hospital-only, gated by a separate bed-count-scaled allowance; now that
// any doctor account can create either note type (a solo doctor can run a
// small ward too), the simplest honest model is one shared count rather
// than reintroducing separate per-type caps or bed-count math for a solo
// practice:
//   free  — 10 notes/month total (OPD + ICU/Ward combined)
//   basic — Rs. 999+GST/month — 100 notes/month total
//   elite — Rs. 1,999+GST/month — unlimited
// Never hard-blocks past quota is NOT the rule here (that overage-allowed
// behavior was specific to hospital ICU/Ward billing, which no longer
// exists) — a doctor past their monthly cap is blocked from creating a
// new note of either type until the next month or an upgrade, same as OPD
// always worked for individual doctors.
const INDIVIDUAL_LIMITS = { free: 10, basic: 100, elite: null }; // null = unlimited

const NOTE_TYPES = ["icu_ward", "opd"];

function currentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function usageColumn(noteType) {
  if (!NOTE_TYPES.includes(noteType)) throw new Error(`Unknown note type: ${noteType}`);
  return noteType === "icu_ward" ? "icu_ward_entries" : "opd_entries";
}

async function getMonthlyCounts(doctorAccountId) {
  const yearMonth = currentYearMonth();
  const result = await pool.query(
    `SELECT icu_ward_entries, opd_entries FROM monthly_usage_counters WHERE account_id = $1 AND year_month = $2`,
    [doctorAccountId, yearMonth]
  );
  return result.rows[0] || { icu_ward_entries: 0, opd_entries: 0 };
}

// Reports whether creating a NEW note (of either type) is currently
// allowed for this doctor. noteType is accepted for API-shape consistency
// (and because incrementNoteUsage still needs it to credit the right
// column) but no longer changes which limit applies — OPD and ICU/Ward
// draw from the same combined monthly count.
async function checkNoteCreationAllowed(doctorAccountId, noteType) {
  const accountResult = await pool.query(`SELECT plan_tier FROM accounts WHERE id = $1`, [doctorAccountId]);
  if (accountResult.rows.length === 0) throw new Error("Doctor account not found");
  const { plan_tier } = accountResult.rows[0];
  // Validate noteType even though it doesn't affect the limit — an
  // unrecognized note type should still fail loudly here, not silently at
  // incrementNoteUsage time after the note's already been created.
  usageColumn(noteType);

  const limit = INDIVIDUAL_LIMITS[plan_tier];
  if (limit === null || limit === undefined) {
    return { allowed: true, planTier: plan_tier, usage: null, limit: null };
  }
  const counts = await getMonthlyCounts(doctorAccountId);
  const usage = counts.opd_entries + counts.icu_ward_entries;
  return { allowed: usage < limit, planTier: plan_tier, usage, limit };
}

async function incrementNoteUsage(doctorAccountId, noteType) {
  const column = usageColumn(noteType);
  const yearMonth = currentYearMonth();
  await pool.query(
    `INSERT INTO monthly_usage_counters (account_id, year_month, ${column})
     VALUES ($1, $2, 1)
     ON CONFLICT (account_id, year_month) DO UPDATE
       SET ${column} = monthly_usage_counters.${column} + 1`,
    [doctorAccountId, yearMonth]
  );
}

async function getUsageStatus(doctorAccountId) {
  const accountResult = await pool.query(`SELECT plan_tier FROM accounts WHERE id = $1`, [doctorAccountId]);
  if (accountResult.rows.length === 0) throw new Error("Doctor account not found");
  const { plan_tier } = accountResult.rows[0];
  const counts = await getMonthlyCounts(doctorAccountId);
  const limit = INDIVIDUAL_LIMITS[plan_tier] ?? null;

  return {
    planTier: plan_tier,
    // Combined quota is what actually gates note creation now.
    usage: counts.opd_entries + counts.icu_ward_entries,
    limit,
    // Per-type breakdown kept for display (e.g. "7 OPD, 2 ICU/Ward this
    // month") even though both draw from the same limit above.
    opd: { usage: counts.opd_entries },
    icuWard: { usage: counts.icu_ward_entries },
  };
}

module.exports = {
  checkNoteCreationAllowed,
  incrementNoteUsage,
  getUsageStatus,
  INDIVIDUAL_LIMITS,
  NOTE_TYPES,
};
