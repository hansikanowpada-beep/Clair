// Versioned migration runner. Replaces the earlier "just re-apply
// schema.sql every time" approach — that was fine when there was nothing
// to migrate FROM, but breaks the moment real data exists and the schema
// needs to change without dropping tables.
//
// Deliberately hand-rolled rather than a dependency like node-pg-migrate:
// this sandbox has no network access to verify an external package's
// exact behavior, and a small, fully-readable runner is easier to trust
// without that verification than an unverified third-party API surface
// would be. If the project later moves somewhere with reliable package
// access, swapping to a maintained tool is reasonable — this is not
// meant to be a permanent stance, just an honest one for right now.
//
// How it works: every file in migrations/ is a single, idempotent-named
// migration (e.g. 001_accounts.sql). A schema_migrations table (created
// automatically on first run) tracks which ones have already been
// applied. Each run only applies files not yet recorded, each inside its
// own transaction — so a failure partway through a migration rolls back
// cleanly instead of leaving the schema half-changed.
//
// schema.sql itself is kept as a reference snapshot (useful for reading
// the whole schema at a glance) but is no longer what actually gets
// applied — migrations/ is the source of truth from here on. If you add
// a table or column, add a new numbered file in migrations/, don't edit
// schema.sql directly (though updating it to stay a correct snapshot for
// readers is worthwhile).

const fs = require("fs");
const path = require("path");
const pool = require("./pool");

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id          TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function getAppliedMigrations(client) {
  const result = await client.query(`SELECT id FROM schema_migrations`);
  return new Set(result.rows.map((r) => r.id));
}

async function migrate() {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort(); // zero-padded numeric prefixes (001_, 002_, ...) sort correctly as strings

    if (files.length === 0) {
      console.log("No migration files found in", MIGRATIONS_DIR);
      return;
    }

    const pending = files.filter((f) => !applied.has(f));
    if (pending.length === 0) {
      console.log(`Database is up to date (${files.length} migrations already applied).`);
      return;
    }

    console.log(`Applying ${pending.length} pending migration(s): ${pending.join(", ")}`);

    for (const file of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(`INSERT INTO schema_migrations (id) VALUES ($1)`, [file]);
        await client.query("COMMIT");
        console.log(`  ✓ ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`  ✗ ${file} failed: ${err.message}`);
        console.error("Stopping — migrations after this one were not attempted.");
        process.exitCode = 1;
        return;
      }
    }

    console.log("All pending migrations applied successfully.");
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
