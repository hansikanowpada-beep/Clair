// ClairMD Clinic — platform backend entry point.
//
// This process handles: accounts/auth, Google Drive connection management,
// backup telemetry, key-wrap routing, care-team instructions, referrals,
// billing/usage metadata, and — since patient_record_content
// (017_patient_record_content.sql) — an optional sync path for a record's
// clinical content, ALWAYS as an opaque, client-side-encrypted blob it has
// no way to decrypt. This process never receives, stores, or reads
// clinical content in plaintext; every route that ever touches it deals
// only in ciphertext (see routes/recordContent.js and
// routes/emergencyProfile.js). See src/db/schema.sql for the full
// rationale before adding any new table or route.

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const pinoHttp = require("pino-http");
const config = require("./config");

const authRoutes = require("./routes/auth");
const accountDirectoryRoutes = require("./routes/accountDirectory");
const driveRoutes = require("./routes/drive");
const coadminRoutes = require("./routes/coadmin");
const recordsRoutes = require("./routes/records");
const recordContentRoutes = require("./routes/recordContent");
const labOrdersRoutes = require("./routes/labOrders");
const followUpsRoutes = require("./routes/followUps");
const careTeamRoutes = require("./routes/careTeam");
const referralsRoutes = require("./routes/referrals");
const billingRoutes = require("./routes/billing");
const patientRoutes = require("./routes/patient");
const dataRightsRoutes = require("./routes/dataRights");
const notificationsRoutes = require("./routes/notifications");
const emergencyProfileRoutes = require("./routes/emergencyProfile");
const hospitalAffiliationsRoutes = require("./routes/hospitalAffiliations");
const hospitalBillingRoutes = require("./routes/hospitalBilling");
const bedAvailabilityRoutes = require("./routes/bedAvailability");
const inventoryRoutes = require("./routes/inventory");
const feedPostsRoutes = require("./routes/feedPosts");
const feedPostRequestsRoutes = require("./routes/feedPostRequests");
const adminRoutes = require("./routes/admin");

const app = express();

const logger = pinoHttp({
  level: config.nodeEnv === "production" ? "info" : "debug",
  // Never log request/response bodies — even platform-metadata payloads can
  // include things like patient display names (care-team instructions) that
  // don't belong sitting in plaintext log files indefinitely.
  serializers: {
    req: (req) => ({ method: req.method, url: req.url, id: req.id }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});

app.use(logger);
app.use(helmet());
app.use(cors({
  origin: config.nodeEnv === "production" ? config.corsOrigin : true,
  credentials: true,
}));
// The `verify` callback stashes the raw bytes onto req.rawBody before
// they're parsed. Needed specifically for payment webhook signature
// verification (routes/billing.js) — HMAC signatures are computed over
// the exact original bytes, and re-serializing req.body with
// JSON.stringify afterward is NOT guaranteed to reproduce them
// byte-for-byte (key order, whitespace). Harmless overhead for every
// other route, which never reads req.rawBody.
app.use(express.json({
  limit: "1mb", // small limit is intentional — this backend never receives file/attachment bodies
  verify: (req, res, buf) => { req.rawBody = buf; },
}));

// Global rate limit. Individual routes (e.g. /auth/login) should layer a
// stricter limit on top of this where brute-force risk is higher — not yet
// added per-route, flagged as a follow-up rather than assumed covered.
app.use(rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.get("/health", (req, res) => {
  res.json({ status: "ok", env: config.nodeEnv, time: new Date().toISOString() });
});

// Mounted under /api to match GOOGLE_REDIRECT_URI in .env.example
// (.../api/drive/oauth/callback) — that convention predates this file, so
// routes are mounted here to match it rather than the reverse.
app.use("/api/auth", authRoutes);
app.use("/api/account-directory", accountDirectoryRoutes);
app.use("/api/drive", driveRoutes);
app.use("/api/coadmin", coadminRoutes);
app.use("/api/records", recordsRoutes);
app.use("/api/record-content", recordContentRoutes);
app.use("/api/lab-orders", labOrdersRoutes);
app.use("/api/follow-ups", followUpsRoutes);
app.use("/api/care-team", careTeamRoutes);
app.use("/api/referrals", referralsRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/data-rights", dataRightsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/emergency-profile", emergencyProfileRoutes);
app.use("/api/hospital-affiliations", hospitalAffiliationsRoutes);
app.use("/api/hospital-billing", hospitalBillingRoutes);
app.use("/api/bed-availability", bedAvailabilityRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/feed-posts", feedPostsRoutes);
app.use("/api/feed-post-requests", feedPostRequestsRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Not found." });
});

// Centralized error handler — catches anything a route didn't handle itself
// so a stray exception never leaks a stack trace (or worse, a DB error
// message) straight to the client.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  req.log?.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Something went wrong on our end." });
});

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`ClairMD Clinic backend listening on port ${config.port} (${config.nodeEnv})`);
});

module.exports = app;
