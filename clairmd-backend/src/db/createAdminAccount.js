// Creates a founder/admin account. Deliberately a standalone script, not
// an API endpoint — 'admin' is not in routes/auth.js's signup schema on
// purpose, so there's no way to create one over the public API at all.
// Run this directly against the database when you need one.
//
// Usage: node src/db/createAdminAccount.js you@example.com "a real password"

const bcrypt = require("bcrypt");
const pool = require("./pool");

const BCRYPT_ROUNDS = 12;

async function run() {
  const [, , email, password, displayName] = process.argv;
  if (!email || !password) {
    console.error("Usage: node src/db/createAdminAccount.js <email> <password> [displayName]");
    process.exitCode = 1;
    return;
  }
  if (password.length < 10) {
    console.error("Password must be at least 10 characters (same rule as regular signup).");
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  try {
    const result = await pool.query(
      `INSERT INTO accounts (account_type, email, password_hash, display_name)
       VALUES ('admin', $1, $2, $3)
       RETURNING id, email, created_at`,
      [email.toLowerCase(), passwordHash, displayName || "Founder"]
    );
    console.log("Admin account created:");
    console.log(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      console.error("An account with this email already exists.");
    } else {
      console.error("Failed to create admin account:", err.message);
    }
    process.exitCode = 1;
  }
}

if (require.main === module) {
  run().finally(() => pool.end());
}

module.exports = { run };
