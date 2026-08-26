require("dotenv").config();

const required = [
  "DATABASE_URL",
  "JWT_SECRET",
  "SECRETS_ENCRYPTION_KEY",
];

function loadConfig() {
  const missing = required.filter((key) => !process.env[key] || process.env[key].startsWith("replace-with"));
  if (missing.length > 0 && process.env.NODE_ENV !== "test") {
    // Fail loudly at startup rather than let a doctor's data silently hit an
    // unconfigured secret later. This is intentional — see README.
    // eslint-disable-next-line no-console
    console.error(
      `\nMissing or unset required environment variables: ${missing.join(", ")}\n` +
      `Copy .env.example to .env and fill these in before starting the server.\n`
    );
    process.exit(1);
  }

  return {
    port: parseInt(process.env.PORT || "4000", 10),
    nodeEnv: process.env.NODE_ENV || "development",
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
    secretsEncryptionKey: process.env.SECRETS_ENCRYPTION_KEY,
    // Comma-separated list, e.g. "https://clairmd.net,https://app.clairmd.net"
    // — kept as a list (not one string) because Vercel gives every
    // deployment its own hostname (branch alias, deployment-hash alias,
    // the stable production alias), and a real custom domain will be
    // added on top of those later. See server.js's corsOriginCheck for
    // how this combines with automatic matching of this project's own
    // *.vercel.app deployment URLs, which change on every deploy and
    // can't be listed here one at a time.
    corsOrigins: (process.env.CORS_ORIGIN || "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
    licenseVerificationProvider: process.env.LICENSE_VERIFICATION_PROVIDER || "unconfigured",
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || null,
    // Separate from the webhook secret above — these authenticate OUTBOUND
    // calls this server makes TO Razorpay's API (create an order, attempt a
    // charge), whereas the webhook secret verifies INBOUND calls Razorpay
    // makes to us. Both are needed for the nightly overage billing job to
    // do anything real; either can be configured independently of the
    // other. See services/hospitalBilling.js's attemptRazorpayCharge.
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || null,
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || null,
    firebase: {
      serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || null, // the whole service account JSON, as a single-line string
    },
    smtp: {
      host: process.env.SMTP_HOST || null,
      port: Number(process.env.SMTP_PORT) || 587,
      user: process.env.SMTP_USER || null,
      pass: process.env.SMTP_PASS || null,
      from: process.env.SMTP_FROM || null,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
      max: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
    },
    // Base URL of the CSNOServ deployment behind BHTS (India's public
    // SNOMED CT terminology service). Defaults to the real public
    // hostname confirmed live 26 August 2026 (see
    // services/bhtsTerminology.js's header comment) — only set this to
    // override, e.g. pointing at a self-hosted instance instead.
    bhtsBaseUrl: process.env.BHTS_BASE_URL || null,
    // Same idea, for LOINCServ (BHTS's LOINC service) — a separate
    // deployment from CSNOServ above, confirmed 26 August 2026 from its
    // own published Swagger/OpenAPI docs.
    loincBaseUrl: process.env.LOINC_BASE_URL || null,
  };
}

module.exports = loadConfig();
