const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");
const { requireAuth, requireAccountType } = require("../middleware/auth");
const { savePaymentMethod, hasPaymentMethod } = require("../services/hospitalBilling");

const router = express.Router();

// Payment-method-on-file registration for hospitals. Per the product
// decision (2026-08-18): hospitals start using the app WITHOUT a payment
// method on file — this is only prompted for once they first hit ICU/
// Ward overage (see routes/records.js's overage response field, which
// the client uses to trigger that prompt). This endpoint just records
// Razorpay's own tokenized references once the hospital has gone through
// Razorpay's own card-collection flow client-side — raw card details
// never reach this backend at all.
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
