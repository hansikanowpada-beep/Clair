const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");
const config = require("../config");
const { requireAuth, requireAccountType } = require("../middleware/auth");
const {
  savePaymentMethod,
  hasPaymentMethod,
  createRazorpaySetupOrder,
  verifyRazorpayPaymentSignature,
  fetchRazorpayPaymentToken,
} = require("../services/hospitalBilling");

const router = express.Router();

// Payment-method-on-file registration for hospitals. Per the product
// decision (2026-08-18): hospitals start using the app WITHOUT a payment
// method on file — this is only prompted for once they first hit ICU/
// Ward overage (see routes/records.js's overage response field, which
// the client uses to trigger that prompt).
//
// Two ways to register one:
// - /payment-method (below): a raw store of already-obtained Razorpay
//   references — kept for flexibility, but nothing here VERIFIES those
//   references are real; a caller could in principle POST garbage IDs
//   and they'd just fail harmlessly later when the nightly job tries to
//   charge them.
// - /setup-order + /setup-order/verify (further down): the real, verified
//   flow — creates a genuine Razorpay order, and only saves a payment
//   method after independently checking Razorpay's own signature on the
//   completed checkout. This is what the frontend's HospitalBillingPanel
//   actually uses.
// Raw card details never reach this backend either way — Razorpay's own
// Checkout collects them client-side.
const paymentMethodSchema = z.object({
  razorpayCustomerId: z.string().min(1),
  razorpayPaymentMethodId: z.string().min(1),
});

router.post("/payment-method", requireAuth, requireAccountType("hospital"), async (req, res) => {
  const parsed = paymentMethodSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payment method payload.", details: parsed.error.flatten() });
  }
  const saved = await savePaymentMethod(req.account.id, parsed.data.razorpayCustomerId, parsed.data.razorpayPaymentMethodId);
  res.status(201).json({ paymentMethod: saved });
});

// Step 1 of the real, verified flow: create a genuine Razorpay order for
// the nominal card-linking authorization charge. The frontend opens
// Razorpay Checkout against this order id. razorpayKeyId is returned
// alongside it — safe to expose, it's the PUBLIC half of the API key
// pair, meant to be embedded in client-side checkout code (the secret
// half never leaves this backend).
router.post("/setup-order", requireAuth, requireAccountType("hospital"), async (req, res) => {
  try {
    const order = await createRazorpaySetupOrder(req.account.id);
    res.status(201).json({ order, razorpayKeyId: config.razorpayKeyId });
  } catch (err) {
    req.log?.error({ err }, "Razorpay setup-order creation failed");
    res.status(502).json({ error: err.message });
  }
});

// Step 2: after Razorpay Checkout completes client-side, independently
// verify it actually happened — signature check first, never trusting
// any client-supplied amount/status — then fetch the resulting token
// from Razorpay directly and save it via the same savePaymentMethod()
// the raw endpoint above uses.
const verifySchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

router.post("/setup-order/verify", requireAuth, requireAccountType("hospital"), async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid verification payload.", details: parsed.error.flatten() });
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;

  if (!verifyRazorpayPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
    return res.status(400).json({ error: "Invalid payment signature." });
  }

  try {
    const { customerId, tokenId } = await fetchRazorpayPaymentToken(razorpayPaymentId);
    const saved = await savePaymentMethod(req.account.id, customerId, tokenId);
    res.status(201).json({ paymentMethod: saved });
  } catch (err) {
    req.log?.error({ err }, "Razorpay payment-token fetch/save failed after a verified checkout");
    res.status(502).json({ error: err.message });
  }
});

router.get("/payment-method/status", requireAuth, requireAccountType("hospital"), async (req, res) => {
  const hasMethod = await hasPaymentMethod(req.account.id);
  res.json({ hasPaymentMethod: hasMethod });
});

// A hospital's own view of unbilled/failed overage entries and current
// restriction state — powers a billing status screen.
router.get("/overage-status", requireAuth, requireAccountType("hospital"), async (req, res) => {
  const pending = await pool.query(
    `SELECT charge_status, COUNT(*) AS count FROM overage_entries WHERE hospital_account_id = $1 GROUP BY charge_status`,
    [req.account.id]
  );
  const restriction = await pool.query(`SELECT admin_restricted_at FROM accounts WHERE id = $1`, [req.account.id]);
  res.json({
    byStatus: pending.rows,
    adminRestricted: Boolean(restriction.rows[0]?.admin_restricted_at),
    adminRestrictedSince: restriction.rows[0]?.admin_restricted_at || null,
  });
});

module.exports = router;
