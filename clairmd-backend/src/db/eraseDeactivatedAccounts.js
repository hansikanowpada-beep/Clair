// Permanent/hard erasure of long-deactivated accounts.
//
// PLACEHOLDER RETENTION PERIOD — not a legal recommendation. 365 days is
// a reasonable-sounding default, not a researched one. The real number
// depends on medical-record retention rules (which vary and this backend
// doesn't hold clinical records anyway — those live in the doctor's own
// Drive) and DPDP's own allowance for retaining data where needed for
// legal compliance. Confirm the real figure with whoever owns compliance
// before relying on this for anything but local testing. Set
// DATA_RETENTION_DAYS to override.
//
// Deliberately a standalone script, not an API route — there's no admin-
// account-type or admin-auth system in this schema yet to safely gate a
// "permanently delete this account" endpoint behind. Until one exists,
// this should be run manually (or via a scheduled job someone
// deliberately sets up), reviewed each time, not exposed as a callable
// endpoint.
//
// DRY RUN BY DEFAULT. Run with --confirm to actually delete anything —
// otherwise this only reports what WOULD be erased. That's intentional:
// this is the kind of script you want to be hard to run by accident.

const pool = require("./pool");

const DEFAULT_RETENTION_DAYS = Number(process.env.DATA_RETENTION_DAYS) || 365;

async function findEligibleAccounts(retentionDays) {
  const result = await pool.query(
    `SELECT id, email, account_type, deactivated_at
     FROM accounts
     WHERE deactivated_at IS NOT NULL
       AND deactivated_at < now() - ($1 || ' days')::interval
     ORDER BY deactivated_at ASC`,
    [retentionDays]
  );
  return result.rows;
}

async function eraseAccount(accountId) {
  // patient_record_index.primary_doctor_id is ON DELETE RESTRICT (see
  // schema.sql) — deliberately so. A doctor account can't be erased while
  // they still have patient records pointing to them; the mandatory
  // "transfer or archive patients" offboarding checklist has to run
  // first. This isn't a bug to work around here — if the DELETE below
  // fails with a foreign-key violation, that's the schema correctly
  // refusing to erase someone before their patients have been handed
  // off, and this function reports that rather than forcing it through.
  try {
    await pool.query(`DELETE FROM accounts WHERE id = $1`, [accountId]);
    return { erased: true };
  } catch (err) {
    if (err.code === "23503") { // foreign_key_violation
      return { erased: false, reason: "Still has patient records referencing this account — offboarding checklist not complete." };
    }
    throw err;
  }
}

async function run() {
  const confirm = process.argv.includes("--confirm");
  const retentionDays = DEFAULT_RETENTION_DAYS;

  const eligible = await findEligibleAccounts(retentionDays);
  console.log(`${eligible.length} account(s) deactivated longer than ${retentionDays} days.`);

  if (!confirm) {
    console.log("DRY RUN — no changes made. Re-run with --confirm to actually erase these accounts.");
    eligible.forEach((a) => console.log(`  would erase: ${a.id} (${a.account_type}, deactivated ${a.deactivated_at.toISOString()})`));
    return;
  }

  let erased = 0, blocked = 0;
  for (const account of eligible) {
    const result = await eraseAccount(account.id);
    if (result.erased) {
      erased++;
      console.log(`  ✓ erased ${account.id}`);
    } else {
      blocked++;
      console.log(`  ✗ skipped ${account.id}: ${result.reason}`);
    }
  }
  console.log(`Done. Erased ${erased}, blocked ${blocked} (needs offboarding completed first).`);
}

if (require.main === module) {
  run()
    .catch((err) => { console.error("Erasure job failed:", err.message); process.exitCode = 1; })
    .finally(() => pool.end());
}

module.exports = { findEligibleAccounts, eraseAccount, DEFAULT_RETENTION_DAYS };
