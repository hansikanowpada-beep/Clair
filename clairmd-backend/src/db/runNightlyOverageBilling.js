// Nightly overage billing job. Per the product decision (2026-08-18):
// invoice/charge nightly rather than waiting until month-end, so an
// unpaid hospital's exposure is capped at roughly a day's overage
// instead of a month's.
//
// Intended to run once daily via a scheduler (cron, a cloud scheduled
// function, etc.) — this file is just the entry point; nothing here
// sets up the actual schedule.
//
// See services/hospitalBilling.js for the real logic and its honest
// caveat: attemptRazorpayCharge() is a stub, not a real Razorpay
// integration, until that's wired up. Running this script today would
// correctly identify and group overage entries by hospital, correctly
// check for a payment method, and correctly mark entries
// 'no_payment_method' where that's the case — but it would throw (and
// mark entries 'failed', triggering restriction) on any hospital that
// DOES have a payment method on file, since the actual charge call
// isn't built yet.

const pool = require("./pool");
const { runNightlyBilling } = require("../services/hospitalBilling");

async function run() {
  console.log(`Running nightly overage billing — ${new Date().toISOString()}`);
  const results = await runNightlyBilling();

  if (results.length === 0) {
    console.log("No hospitals with pending overage entries tonight.");
    return;
  }

  for (const r of results) {
    console.log(`  ${r.hospitalId}: ${r.count} entries — ${r.outcome}${r.error ? ` (${r.error})` : ""}`);
  }
  console.log(`Done. ${results.length} hospital(s) processed.`);
}

if (require.main === module) {
  run()
    .catch((err) => { console.error("Nightly billing job failed:", err.message); process.exitCode = 1; })
    .finally(() => pool.end());
}

module.exports = { run };
