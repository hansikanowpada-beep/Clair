const express = require("express");
const pool = require("../db/pool");
const { requireAuth, requireAccountType } = require("../middleware/auth");
const { harvest: harvestIcd10 } = require("../db/harvestIcd10");

const router = express.Router();

// Tracks whether an ICD-10 harvest is currently running, so a second
// trigger (e.g. an accidental double-click) doesn't start a duplicate
// crawl hammering WHO's API concurrently with the first one.
let icd10HarvestRunning = false;

// Founder/admin-only aggregate views across the whole platform. Every
// route here is gated to account_type = 'admin', which (see db/schema.sql
// and db/createAdminAccount.js) can never be created through the public
// signup API — only via the standalone bootstrap script. This is
// deliberately read-only: nothing here lets an admin modify a doctor's or
// hospital's own data directly, only see aggregate platform state.

// High-level counts: accounts by type/tier, signups this month vs last,
// and this month's revenue.
router.get("/overview", requireAuth, requireAccountType("admin"), async (req, res) => {
  const [byType, byDoctorTier, byHospitalTier, signupsThisMonth, signupsLastMonth, revenueThisMonth] = await Promise.all([
    pool.query(`SELECT account_type, COUNT(*) AS count FROM accounts GROUP BY account_type`),
    pool.query(`SELECT plan_tier, COUNT(*) AS count FROM accounts WHERE account_type IN ('individual_doctor', 'hospital_doctor') GROUP BY plan_tier`),
    pool.query(`SELECT hospital_plan_tier, COUNT(*) AS count FROM accounts WHERE account_type = 'hospital' GROUP BY hospital_plan_tier`),
    pool.query(`SELECT COUNT(*) AS count FROM accounts WHERE created_at >= date_trunc('month', now())`),
    pool.query(`SELECT COUNT(*) AS count FROM accounts WHERE created_at >= date_trunc('month', now() - interval '1 month') AND created_at < date_trunc('month', now())`),
    pool.query(`SELECT COALESCE(SUM(amount_paise), 0) AS total_paise FROM billing_events WHERE occurred_at >= date_trunc('month', now())`),
  ]);

  res.json({
    accountsByType: byType.rows,
    doctorPlanTiers: byDoctorTier.rows,
    hospitalPlanTiers: byHospitalTier.rows,
    signupsThisMonth: Number(signupsThisMonth.rows[0].count),
    signupsLastMonth: Number(signupsLastMonth.rows[0].count),
    revenueThisMonthPaise: Number(revenueThisMonth.rows[0].total_paise),
  });
});

// Kicks off the ICD-10 harvest (see db/harvestIcd10.js) as a background
// task inside this already-running server process — Render's free tier
// has no Shell access to run it as a standalone script, so this is the
// only way to trigger it. Deliberately requireAuth only, not admin-only:
// see the same reasoning on the (now-removed) icd10-probe route this
// replaced. Responds immediately; the harvest keeps running after the
// response is sent (and after the triggering browser tab is closed) for
// as long as this server process stays up. It's safely resumable (see
// migrations/027_icd10_harvest_progress.sql) if Render's free tier spins
// the service down mid-run — just trigger this route again.
router.post("/harvest-icd10", requireAuth, (req, res) => {
  if (icd10HarvestRunning) {
    return res.status(409).json({ error: "A harvest is already running." });
  }
  icd10HarvestRunning = true;
  res.json({ started: true, note: "Running in the background — check GET /admin/harvest-icd10/status for progress." });
  harvestIcd10()
    .catch((err) => console.error("Background ICD-10 harvest failed:", err.message))
    .finally(() => { icd10HarvestRunning = false; });
});

router.get("/harvest-icd10/status", requireAuth, async (req, res) => {
  const [total, complete] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS count FROM icd10_codes`),
    pool.query(`SELECT COUNT(*) AS count FROM icd10_codes WHERE harvest_complete`),
  ]);
  res.json({
    running: icd10HarvestRunning,
    codesStored: Number(total.rows[0].count),
    subtreesComplete: Number(complete.rows[0].count),
  });
});

// Revenue for the current Indian financial year (1 April - 31 March),
// broken down month by month — the shape an ITR filing actually needs,
// unlike /overview's single "this calendar month" figure. Only covers
// billing_events (doctor/hospital plan subscriptions); hospital overage
// charges aren't included since overage_entries has no amount column yet
// and services/hospitalBilling.js's Razorpay charge isn't wired up (see
// its own header comment) — so there's no real collected overage revenue
// to report yet. This is a raw record-keeping aid, not a filed return —
// still needs a CA's review for GST treatment, deductions, etc.
router.get("/accounting-summary", requireAuth, requireAccountType("admin"), async (req, res) => {
  const fyStartResult = await pool.query(`
    SELECT (CASE WHEN EXTRACT(MONTH FROM now()) >= 4
      THEN make_date(EXTRACT(YEAR FROM now())::int, 4, 1)
      ELSE make_date(EXTRACT(YEAR FROM now())::int - 1, 4, 1)
    END) AS fy_start
  `);
  const fyStart = fyStartResult.rows[0].fy_start;
  const [monthly, total] = await Promise.all([
    pool.query(
      `SELECT to_char(occurred_at, 'YYYY-MM') AS year_month, COALESCE(SUM(amount_paise), 0) AS total_paise
       FROM billing_events
       WHERE occurred_at >= $1 AND occurred_at < $1::date + interval '1 year'
       GROUP BY year_month ORDER BY year_month`,
      [fyStart]
    ),
    pool.query(
      `SELECT COALESCE(SUM(amount_paise), 0) AS total_paise FROM billing_events
       WHERE occurred_at >= $1 AND occurred_at < $1::date + interval '1 year'`,
      [fyStart]
    ),
  ]);
  res.json({
    financialYearStart: fyStart,
    monthly: monthly.rows.map((r) => ({ yearMonth: r.year_month, totalPaise: Number(r.total_paise) })),
    totalPaise: Number(total.rows[0].total_paise),
  });
});

// Hospitals currently restricted for unresolved overage billing, plus
// how much overage revenue is sitting uncollected across the platform —
// this is the "who needs a phone call" view.
router.get("/hospitals-at-risk", requireAuth, requireAccountType("admin"), async (req, res) => {
  const restricted = await pool.query(
    `SELECT id, display_name, bed_count, hospital_plan_tier, admin_restricted_at
     FROM accounts WHERE account_type = 'hospital' AND admin_restricted_at IS NOT NULL
     ORDER BY admin_restricted_at ASC`
  );
  const pendingByHospital = await pool.query(
    `SELECT hospital_account_id, charge_status, COUNT(*) AS count
     FROM overage_entries
     WHERE charge_status IN ('pending', 'failed', 'no_payment_method')
     GROUP BY hospital_account_id, charge_status`
  );
  res.json({
    restrictedHospitals: restricted.rows,
    pendingOverageByHospital: pendingByHospital.rows,
  });
});

// Backup reliability across the whole platform — flags whether a
// meaningful share of doctors are silently failing their nightly Drive
// backups, which is a real risk to their patient records and something
// the founder should know about even though this backend never sees the
// backed-up content itself.
router.get("/backup-health", requireAuth, requireAccountType("admin"), async (req, res) => {
  const last7Days = await pool.query(
    `SELECT status, COUNT(*) AS count FROM backup_events
     WHERE occurred_at >= now() - interval '7 days' GROUP BY status`
  );
  const accountsWithRecentFailure = await pool.query(
    `SELECT DISTINCT account_id FROM backup_events
     WHERE status = 'failed' AND occurred_at >= now() - interval '7 days'`
  );
  res.json({
    last7Days: last7Days.rows,
    accountsWithRecentFailureCount: accountsWithRecentFailure.rows.length,
  });
});

// Notification delivery health — mostly useful once real FCM/SMTP
// credentials exist (see services/notifications.js's honest stub note);
// before that, expect delivered_at to stay null for everything, which is
// itself a useful signal that credentials still need configuring.
router.get("/notification-health", requireAuth, requireAccountType("admin"), async (req, res) => {
  const result = await pool.query(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE delivered_at IS NOT NULL) AS delivered,
       COUNT(*) FILTER (WHERE delivered_at IS NULL) AS undelivered
     FROM notifications WHERE created_at >= now() - interval '7 days'`
  );
  res.json({
    last7Days: {
      total: Number(result.rows[0].total),
      delivered: Number(result.rows[0].delivered),
      undelivered: Number(result.rows[0].undelivered),
    },
  });
});

module.exports = router;
