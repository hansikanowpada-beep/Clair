const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const pool = require("../db/pool");
const config = require("../config");
const { requireAuth } = require("../middleware/auth");
const { verifyMedicalLicense } = require("../services/licenseVerification");

const router = express.Router();
const BCRYPT_ROUNDS = 12;

// Layered on top of the global limiter in server.js. Login is the real
// brute-force target — keyed on IP + attempted email together, so one
// attacker hammering many accounts from one IP is still caught, without
// one shared office IP locking out every doctor using it.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${(req.body?.email || "").toLowerCase()}`,
  message: { error: "Too many login attempts. Please wait a few minutes and try again." },
});

// Signup abuse (bulk fake-account creation) is a lower-frequency but real
// risk too — looser than login since legitimate signups are one-time, not
// repeated.
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many signup attempts from this connection. Please try again later." },
});

const signupSchema = z.object({
  accountType: z.enum(["hospital", "individual_doctor", "hospital_doctor", "patient", "care_team_member"]),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(10, "Password must be at least 10 characters."),
  displayName: z.string().min(1),
  specialty: z.string().optional(),
  licenseNumber: z.string().optional(),
});

router.post("/signup", signupLimiter, async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid signup data.", details: parsed.error.flatten() });
  }
  const { accountType, email, phone, password, displayName, specialty, licenseNumber } = parsed.data;

  const isDoctorType = accountType === "individual_doctor" || accountType === "hospital_doctor";
  if (isDoctorType && !licenseNumber) {
    return res.status(400).json({ error: "License number is required for doctor accounts." });
  }

  // License verification: dev-mode accepts any non-empty string; real
  // deployments need a configured provider — see the researched options
  // and provider pattern in services/licenseVerification.js.
  if (isDoctorType) {
    const verified = await verifyMedicalLicense(licenseNumber);
    if (!verified) {
      return res.status(422).json({ error: "License number could not be verified. Please check and try again." });
    }
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  try {
    const result = await pool.query(
      `INSERT INTO accounts (account_type, email, phone, password_hash, display_name, specialty, license_number, license_verified_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, account_type, email, display_name, plan_tier, created_at`,
      [accountType, email.toLowerCase(), phone || null, passwordHash, displayName, specialty || null, licenseNumber || null, isDoctorType ? new Date() : null]
    );
    const account = result.rows[0];
    const token = signToken(account.id, account.account_type);
    return res.status(201).json({ account, token });
  } catch (err) {
    if (err.code === "23505") {
      // unique_violation on email
      return res.status(409).json({ error: "An account with this email already exists." });
    }
    // eslint-disable-next-line no-console
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Something went wrong creating the account." });
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  const { email, password } = parsed.data;

  const result = await pool.query(
    `SELECT id, account_type, password_hash, deactivated_at FROM accounts WHERE email = $1`,
    [email.toLowerCase()]
  );
  const account = result.rows[0];

  // Deliberately identical error for "no such account" and "wrong password"
  // — don't leak which emails are registered.
  const genericError = () => res.status(401).json({ error: "Incorrect email or password." });

  if (!account || account.deactivated_at) return genericError();

  const passwordMatches = await bcrypt.compare(password, account.password_hash);
  if (!passwordMatches) return genericError();

  const token = signToken(account.id, account.account_type);
  return res.json({ token });
});

router.get("/me", requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT id, account_type, email, display_name, specialty, plan_tier, two_factor_enabled, public_key, created_at
     FROM accounts WHERE id = $1`,
    [req.account.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "Account not found." });
  return res.json({ account: result.rows[0] });
});

// Publishes this account's RSA-OAEP public key (SPKI, base64) for co-admin
// key-wrap crypto — see routes/coadmin.js. The matching private key never
// reaches this backend; only the client that generated the keypair has it
// (see ClairMDEHR.jsx's getOrCreateKeyPair). A public key is, by
// definition, not sensitive — no extra access check beyond being logged in
// as the account whose key this is.
const publicKeySchema = z.object({ publicKey: z.string().min(1).max(4000) });

router.put("/public-key", requireAuth, async (req, res) => {
  const parsed = publicKeySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "publicKey is required." });

  await pool.query(`UPDATE accounts SET public_key = $1, updated_at = now() WHERE id = $2`, [parsed.data.publicKey, req.account.id]);
  return res.json({ publicKey: parsed.data.publicKey });
});

function signToken(accountId, accountType) {
  return jwt.sign({ sub: accountId, accountType }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

module.exports = router;
