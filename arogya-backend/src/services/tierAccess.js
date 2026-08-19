const pool = require("../db/pool");

// Works against a BILLING CONTEXT — an account_id that may be the calling
// doctor's own account (personal practice) or a hospital account they're
// affiliated with. See routes/hospitalAffiliations.js and routes/
// records.js's billingContextId handling.
//
// Individual-doctor limits, final (2026-08-18, revised same day — ICU/
// Ward notes REMOVED from individual doctors entirely, per product
// decision: daily-rounds-style ICU/Ward documentation is a hospital
// pattern, not a solo-clinic one):
//   free  — 10 OPD notes/month, NO ICU/Ward notes at all
//   basic — Rs. 999+GST/month — 100 OPD notes/month, NO ICU/Ward notes
//   elite — Rs. 1,999+GST/month — unlimited OPD, NO ICU/Ward notes
// An individual/solo doctor account can never create an ICU/Ward note —
// only a note created under a hospital billing context can be icu_ward.
const INDIVIDUAL_LIMITS = {
  free: { opd: 10 },
  basic: { opd: 100 },
  elite: null, // null = unlimited
};

// Hospital limits (2026-08-18): ICU/Ward quota is DERIVED from bed count
// and plan tier, not a flat number — reflects that daily (sometimes 3x/
// day) rounds mean real documentation volume scales directly with beds.
// Formula: bedCount * NOTES_PER_BED_PER_DAY * includedDaysForTier.
// Beyond the included ICU/Ward quota, notes are allowed to continue
// (never blocking patient care) but are billed as overage — see
// services/hospitalBilling.js for the nightly overage-charge logic.
//
// Hospital OPD caps (2026-08-18 product decision): flat multiplier of
// ~2.5x the individual-doctor numbers, NOT scaled by bed count — unlike
// ICU rounds, a hospital's outpatient volume doesn't track bed count
// (an ICU-heavy hospital may see few OPD patients; a diagnostics-heavy
// one may see hundreds regardless of beds), so a flat per-tier number
// fits better than forcing OPD into the same beds×3×days formula ICU
// uses. Elite and Elite Plus are unlimited on OPD, matching how
// individual-doctor Elite is unlimited too.
const NOTES_PER_BED_PER_DAY = 3;
const HOSPITAL_INCLUDED_DAYS = { free: 3, basic: 10, elite: 20 }; // no elite_plus entry — see below, it's genuinely unlimited
const HOSPITAL_OPD_LIMITS = { free: 25, basic: 250, elite: null, elite_plus: null };

// null return = genuinely unlimited (elite_plus has no entry in
// HOSPITAL_INCLUDED_DAYS on purpose — simplified to match how
// individual-doctor Elite is unlimited rather than a large-but-finite
// number, which was the original design before this revision).
function hospitalIcuQuota(bedCount, hospitalPlanTier) {
  const days = HOSPITAL_INCLUDED_DAYS[hospitalPlanTier];
  if (hospitalPlanTier === "elite_plus") return null;
  if (!bedCount || !days) return 0;
  return bedCount * NOTES_PER_BED_PER_DAY * days;
}

const NOTE_TYPES = ["icu_ward", "opd"];

function currentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function usageColumn(noteType) {
  if (!NOTE_TYPES.includes(noteType)) throw new Error(`Unknown note type: ${noteType}`);
  return noteType === "icu_ward" ? "icu_ward_entries" : "opd_entries";
}

async function getMonthlyCounts(billingContextId) {
  const yearMonth = currentYearMonth();
  const result = await pool.query(
    `SELECT icu_ward_entries, opd_entries FROM monthly_usage_counters WHERE account_id = $1 AND year_month = $2`,
    [billingContextId, yearMonth]
  );
  return result.rows[0] || { icu_ward_entries: 0, opd_entries: 0 };
}

// Reports whether creating a NEW note of this type is currently allowed
// against the given billing context. For hospital ICU/Ward past the
// included quota: `allowed` is still true (never block patient
// documentation) but `overage` is true — the caller (routes/records.js)
// still creates the note and separately flags it for nightly overage
// billing, it does NOT refuse the request. Hospital OPD, by contrast,
// DOES hard-block past its cap on free/basic (same shape as individual
// doctors) since OPD was never designed to have an overage-billing path
// — only ICU/Ward has one.
async function checkNoteCreationAllowed(billingContextId, noteType) {
  const accountResult = await pool.query(
    `SELECT account_type, plan_tier, hospital_plan_tier, bed_count FROM accounts WHERE id = $1`,
    [billingContextId]
  );
  if (accountResult.rows.length === 0) throw new Error("Billing context account not found");
  const { account_type, plan_tier, hospital_plan_tier, bed_count } = accountResult.rows[0];

  if (account_type === "hospital") {
    if (noteType === "opd") {
      const opdLimit = HOSPITAL_OPD_LIMITS[hospital_plan_tier];
      if (opdLimit === null || opdLimit === undefined) {
        return { allowed: true, planTier: hospital_plan_tier, billingContext: "hospital", usage: null, limit: null, overage: false };
      }
      const counts = await getMonthlyCounts(billingContextId);
      return {
        allowed: counts.opd_entries < opdLimit,
        planTier: hospital_plan_tier,
        billingContext: "hospital",
        usage: counts.opd_entries,
        limit: opdLimit,
        overage: false,
      };
    }
    const counts = await getMonthlyCounts(billingContextId);
    const quota = hospitalIcuQuota(bed_count, hospital_plan_tier);
    if (quota === null) {
      // elite_plus — genuinely unlimited, no overage tracking at all
      return { allowed: true, planTier: hospital_plan_tier, billingContext: "hospital", usage: counts.icu_ward_entries, limit: null, overage: false };
    }
    const overage = counts.icu_ward_entries >= quota;
    return {
      allowed: true, // never blocks — see comment above
      planTier: hospital_plan_tier,
      billingContext: "hospital",
      usage: counts.icu_ward_entries,
      limit: quota,
      overage,
    };
  }

  // Individual doctor: ICU/Ward is not available at all.
  if (noteType === "icu_ward") {
    return { allowed: false, planTier: plan_tier, billingContext: "individual", usage: null, limit: 0, reason: "icu_ward_not_available_for_individual" };
  }

  const limits = INDIVIDUAL_LIMITS[plan_tier];
  if (!limits) {
    return { allowed: true, planTier: plan_tier, billingContext: "individual", usage: null, limit: null };
  }
  const counts = await getMonthlyCounts(billingContextId);
  const usage = counts.opd_entries;
  const limit = limits.opd;
  return { allowed: usage < limit, planTier: plan_tier, billingContext: "individual", usage, limit };
}

async function incrementNoteUsage(billingContextId, noteType) {
  const column = usageColumn(noteType);
  const yearMonth = currentYearMonth();
  await pool.query(
    `INSERT INTO monthly_usage_counters (account_id, year_month, ${column})
     VALUES ($1, $2, 1)
     ON CONFLICT (account_id, year_month) DO UPDATE
       SET ${column} = monthly_usage_counters.${column} + 1`,
    [billingContextId, yearMonth]
  );
}

async function getUsageStatus(billingContextId) {
  const accountResult = await pool.query(
    `SELECT account_type, plan_tier, hospital_plan_tier, bed_count FROM accounts WHERE id = $1`,
    [billingContextId]
  );
  if (accountResult.rows.length === 0) throw new Error("Billing context account not found");
  const { account_type, plan_tier, hospital_plan_tier, bed_count } = accountResult.rows[0];
  const counts = await getMonthlyCounts(billingContextId);

  if (account_type === "hospital") {
    const quota = hospitalIcuQuota(bed_count, hospital_plan_tier);
    const opdLimit = HOSPITAL_OPD_LIMITS[hospital_plan_tier];
    return {
      billingContext: "hospital",
      planTier: hospital_plan_tier,
      bedCount: bed_count,
      icuWard: {
        usage: counts.icu_ward_entries,
        limit: quota, // null = unlimited (elite_plus)
        overage: quota !== null && counts.icu_ward_entries >= quota,
      },
      opd: {
        usage: counts.opd_entries,
        limit: opdLimit === undefined ? null : opdLimit, // null = unlimited (elite/elite_plus)
      },
    };
  }

  const limits = INDIVIDUAL_LIMITS[plan_tier];
  return {
    billingContext: "individual",
    planTier: plan_tier,
    icuWard: { usage: 0, limit: 0, note: "ICU/Ward notes are not available on individual-doctor plans" },
    opd: { usage: counts.opd_entries, limit: limits ? limits.opd : null },
  };
}

module.exports = {
  checkNoteCreationAllowed,
  incrementNoteUsage,
  getUsageStatus,
  hospitalIcuQuota,
  INDIVIDUAL_LIMITS,
  HOSPITAL_OPD_LIMITS,
  NOTES_PER_BED_PER_DAY,
  HOSPITAL_INCLUDED_DAYS,
  NOTE_TYPES,
};
