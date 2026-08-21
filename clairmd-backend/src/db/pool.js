const { Pool } = require("pg");
const config = require("../config");

const pool = new Pool({
  connectionString: config.databaseUrl,
  // Keep the pool modest — this database only ever handles account/billing/
  // referral/telemetry traffic, never patient content, so it stays light
  // regardless of how many patients exist on the platform.
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("Unexpected error on idle database client", err);
});

module.exports = pool;
