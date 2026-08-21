const express = require("express");
const crypto = require("crypto");
const { z } = require("zod");
const pool = require("../db/pool");
const config = require("../config");
const { requireAuth, requireAccountType } = require("../middleware/auth");

const router = express.Router();

// Real Razorpay webhook signature verification lives below (/webhook) —
// this IS the genuine payment-processor integration, not a stub. What's
// still a stub is the PLAN_TIER mapping from Razorpay's own plan/price
// IDs (RAZORPAY_PLAN_TIER_MAP below) — that mapping depends on the
// actual plan IDs created in a real Razorpay dashboard, which don't
// exist yet. Payment card data itself never touches this backend either
// way (see schema.sql's billing_events comment) — Razorpay holds that,
// this only ever sees plan/amount/reference metadata.

const DOCTOR_TYPES = ["individual_doctor", "hospital_doctor"];
const PLAN_TIERS = ["free", "basic", "elite"];

router.get("/history", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const result = await pool.query(
    `SELECT id, plan_tier, amount_paise, payment_reference, occurred_at
     FROM billing_events WHERE account_id = $1 ORDER BY occurred_at DESC`,
    [req.account.id]
  );
  res.json({ events: result.rows });
});

router.get("/plan", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const result = await pool.query(`SELECT plan_tier FROM accounts WHERE id = $1`, [req.account.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: "Account not found." });
  res.json({ planTier: result.rows[0].plan_tier });
});

// Manual/test recording point — for dev/testing only. Real transactions
// should flow through /webhook below instead, which is actually verified
// against Razorpay's signature rather than trusting whoever calls this.
const eventSchema = z.object({
  planTier: z.enum(PLAN_TIERS),
  amountPaise: z.number().int().nonnegative().optional(),
  paymentReference: z.string().max(200).optional(),
});

router.post("/events", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid billing event payload.", details: parsed.error.flatten() });
  }
  const { planTier, amountPaise, paymentReference } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const event = await client.query(
      `INSERT INTO billing_events (account_id, plan_tier, amount_paise, payment_reference)
       VALUES ($1, $2, $3, $4)
       RETURNING id, plan_tier, amount_paise, payment_reference, occurred_at`,
      [req.account.id, planTier, amountPaise || null, paymentReference || null]
    );
    await client.query(`UPDATE accounts SET plan_tier = $1, updated_at = now() WHERE id = $2`, [planTier, req.account.id]);
    await client.query("COMMIT");
    res.status(201).json({ event: event.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// --- Real Razorpay webhook ------------------------------------------------
//
// Maps Razorpay's own plan/subscription IDs to this app's plan_tier enum.
// Placeholder values — fill in with the real IDs once plans exist in a
// real Razorpay dashboard. Left empty rather than guessed, since a wrong
// guess here would silently misattribute a doctor's paid tier.
const RAZORPAY_PLAN_TIER_MAP = {
  // "plan_XXXXXXXXXXXXXX": "basic",
  // "plan_YYYYYYYYYYYYYY": "elite",
};

function verifyRazorpaySignature(rawBody, signatureHeader, webhookSecret) {
  if (!rawBody || !signatureHeader || !webhookSecret) return false;
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  // Constant-time comparison — a plain === here would leak timing
  // information an attacker could use to guess the correct signature
  // byte-by-byte. Both buffers must be equal length for timingSafeEqual;
  // mismatched lengths mean an invalid signature by definition.
  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(signatureHeader, "hex");
  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

// No requireAuth here on purpose — Razorpay calls this directly, it
// doesn't have (and shouldn't need) a session token for this account.
// The signature check below is what authenticates the request instead.
router.post("/webhook", async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  const verified = verifyRazorpaySignature(req.rawBody, signature, config.razorpayWebhookSecret);

  if (!verified) {
    // Deliberately vague response — don't tell a would-be attacker
    // whether it was the signature, the secret, or something else that
    // failed.
    return res.status(400).json({ error: "Invalid webhook signature." });
  }

  const event = req.body;
  const eventType = event?.event;

  // Only handling payment-captured events for now — Razorpay sends many
  // event types (subscription.charged, payment.failed, refund.processed,
  // etc.) that aren't wired up yet. Acknowledging with 200 for unhandled
  // types (rather than erroring) matches Razorpay's own guidance: an
  // error response causes them to retry indefinitely, which isn't useful
  // for an event type this backend doesn't act on anyway.
  if (eventType !== "payment.captured") {
    return res.status(200).json({ received: true, handled: false });
  }

  const payment = event?.payload?.payment?.entity;
  if (!payment) {
    return res.status(400).json({ error: "Malformed webhook payload." });
  }

  const razorpayPlanId = payment.notes?.clairmd_plan_id; // set when creating the payment/order — depends on real integration wiring
  const planTier = RAZORPAY_PLAN_TIER_MAP[razorpayPlanId];
  const accountId = payment.notes?.clairmd_account_id; // set the same way

  if (!planTier || !accountId) {
    // Genuinely can't attribute this payment to a known plan/account —
    // logged for manual reconciliation rather than silently dropped or
    // guessed at.
    req.log?.warn({ razorpayPlanId, accountId, paymentId: payment.id }, "Razorpay webhook: could not map payment to a known plan/account");
    return res.status(200).json({ received: true, handled: false, reason: "unmapped plan or account" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO billing_events (account_id, plan_tier, amount_paise, payment_reference)
       VALUES ($1, $2, $3, $4)`,
      [accountId, planTier, payment.amount, payment.id]
    );
    await client.query(`UPDATE accounts SET plan_tier = $1, updated_at = now() WHERE id = $2`, [planTier, accountId]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  res.status(200).json({ received: true, handled: true });
});

module.exports = router;
