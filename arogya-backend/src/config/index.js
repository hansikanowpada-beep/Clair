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
    corsOrigin: process.env.CORS_ORIGIN || null,
    licenseVerificationProvider: process.env.LICENSE_VERIFICATION_PROVIDER || "unconfigured",
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || null,
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
  };
}

module.exports = loadConfig();
