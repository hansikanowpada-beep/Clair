// Notification delivery job. Attempts push (Firebase Cloud Messaging),
// falling back to email (SMTP) — see services/notifications.js for the
// real logic. Intended to run on a short interval (e.g. every 1-2
// minutes via a scheduler) rather than nightly like the billing job,
// since a referral or care-team instruction notification is time-
// sensitive in a way overage billing isn't.
//
// Until now nothing ever called deliverPending() at all — enqueue() (the
// in-app notification row) always worked, but no scheduled job existed
// to actually attempt push/email delivery for what it queued. This is
// that missing entry point, mirroring runNightlyOverageBilling.js's own
// "this file is just the entry point; nothing here sets up the actual
// schedule" shape.

const pool = require("./pool");
const { deliverPending } = require("../services/notifications");

async function run() {
  console.log(`Running notification delivery — ${new Date().toISOString()}`);
  const result = await deliverPending();
  console.log(`Processed ${result.processed}, delivered ${result.delivered}.`);
  return result;
}

if (require.main === module) {
  run()
    .catch((err) => { console.error("Notification delivery job failed:", err.message); process.exitCode = 1; })
    .finally(() => pool.end());
}

module.exports = { run };
