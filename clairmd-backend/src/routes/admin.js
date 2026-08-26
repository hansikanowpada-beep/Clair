const express = require("express");
const pool = require("../db/pool");
const { requireAuth, requireAccountType } = require("../middleware/auth");

const router = express.Router();

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
