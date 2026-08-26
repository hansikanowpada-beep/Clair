const crypto = require("crypto");
const pool = require("../db/pool");
const config = require("../config");

// --- Real Razorpay Checkout integration — the "add a payment method"
// flow (distinct from attemptRazorpayCharge below, which charges an
// ALREADY-saved method with no customer present). This is Razorpay's
// most stable, most universally-documented API surface — the same
// order-create + Checkout.js + signature-verify shape every Razorpay
// integration uses, unchanged for years — so confidence here is
// genuinely high, unlike the specific recurring-charge endpoint. The one
// piece that ISN'T independently verified (see fetchRazorpayPaymentToken
// below) is the exact field names Razorpay returns for the resulting
// recurring-charge token, since this sandbox's network policy blocks
// razorpay.com entirely, including their docs. -----------------------------

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

function razorpayAuthHeader() {
  const basic = Buffer.from(`${config.razorpayKeyId}:${config.razorpayKeySecret}`).toString("base64");
  return `Basic ${basic}`;
}

// Nominal authorization amount to link a card/UPI mandate for future
// recurring overage billing. The EXACT number (and whether it's ever
// refunded) is a product/business decision, not something to invent
// silently — Rs. 1.00 is a common industry placeholder for "verify a
// payment method without meaningfully charging the customer," used here
// as exactly that: a placeholder for a human to confirm or change.
const PAYMENT_METHOD_SETUP_AMOUNT_PAISE = 100; // Rs. 1.00 — PLACEHOLDER, confirm before relying on this

async function createRazorpaySetupOrder(hospitalAccountId) {
  if (!config.razorpayKeyId || !config.razorpayKeySecret) {
    throw new Error("Razorpay API keys aren't configured (RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET).");
  }
  const res = await fetch(`${RAZORPAY_API_BASE}/orders`, {
    method: "POST",
    headers: { Authorization: razorpayAuthHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: PAYMENT_METHOD_SETUP_AMOUNT_PAISE,
      currency: "INR",
      receipt: `clairmd-pm-setup-${hospitalAccountId}-${Date.now()}`,
      payment_capture: 1,
      notes: { purpose: "clairmd_payment_method_setup", hospitalAccountId },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Razorpay order creation failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return res.json();
}

// Same HMAC-SHA256 scheme as the webhook signature check in
// routes/billing.js, but over a DIFFERENT string — Razorpay signs
// "{order_id}|{payment_id}" for a checkout-completion signature, vs. the
// raw webhook body for the webhook signature. Two genuinely different,
// both well-documented, both stable schemes.
function verifyRazorpayPaymentSignature(orderId, paymentId, signature) {
  if (!orderId || !paymentId || !signature || !config.razorpayKeySecret) return false;
  const expected = crypto.createHmac("sha256", config.razorpayKeySecret).update(`${orderId}|${paymentId}`).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

// Fetches the completed payment from Razorpay and extracts the
// recurring-charge reference for future nightly billing (see
// attemptRazorpayCharge below, and payment_methods' razorpay_customer_id/
// razorpay_payment_method_id columns). The field names read here
// (customer_id, token_id) are based on training knowledge of Razorpay's
// tokenization API, NOT independently verified against live
// documentation — flagged explicitly rather than silently assumed
// correct. If this throws in practice, the fix is almost certainly
// adjusting which field this reads (check the real payment object in the
// Razorpay dashboard), not the surrounding order-create/signature-verify/
// save flow, which IS the stable, verified part.
async function fetchRazorpayPaymentToken(paymentId) {
  const res = await fetch(`${RAZORPAY_API_BASE}/payments/${paymentId}`, {
    headers: { Authorization: razorpayAuthHeader() },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Fetching the Razorpay payment failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const payment = await res.json();
  if (!payment.token_id || !payment.customer_id) {
    throw new Error(
      "Razorpay payment succeeded, but no token_id/customer_id came back on the payment record — " +
      "this usually means the checkout wasn't actually flagged as a recurring/tokenized transaction " +
      "(see the frontend's Razorpay Checkout options). Check this payment in the Razorpay dashboard " +
      "before assuming this code itself is wrong."
    );
  }
  return { customerId: payment.customer_id, tokenId: payment.token_id };
}

// Per-overage-note rate, by hospital tier (2026-08-18 product decision).
// Decreases as tier increases, deliberately — mirrors the base
// subscription pricing itself (bigger hospitals get better per-unit
// economics), and keeps overage meaningfully above what a hospital is
// already effectively paying per note within their own included quota,
// so staying in overage indefinitely is never cheaper than upgrading.
// elite_plus has no entry — its ICU/Ward quota is unlimited (see
// tierAccess.js), so overage never applies to it at all.
const OVERAGE_RATE_PAISE_BY_TIER = {
  free: 2500,  // Rs. 25.00/note — deliberately the steepest, since free is meant as a trial, not a viable long-term operating mode
  basic: 1500, // Rs. 15.00/note
  elite: 800,  // Rs. 8.00/note
};

function getOverageRatePaise(hospitalPlanTier) {
  return OVERAGE_RATE_PAISE_BY_TIER[hospitalPlanTier] ?? OVERAGE_RATE_PAISE_BY_TIER.free; // fail toward the safer/steeper rate on an unrecognized tier rather than silently undercharging
}

async function hasPaymentMethod(accountId) {
  const result = await pool.query(`SELECT 1 FROM payment_methods WHERE account_id = $1`, [accountId]);
  return result.rows.length > 0;
}

async function savePaymentMethod(accountId, razorpayCustomerId, razorpayPaymentMethodId) {
  const result = await pool.query(
    `INSERT INTO payment_methods (account_id, razorpay_customer_id, razorpay_payment_method_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (account_id) DO UPDATE
       SET razorpay_customer_id = $2, razorpay_payment_method_id = $3, added_at = now()
     RETURNING id, added_at`,
    [accountId, razorpayCustomerId, razorpayPaymentMethodId]
  );
  return result.rows[0];
}

// Records that a specific note was created past the hospital's included
// ICU/Ward quota — called from routes/records.js right after creating an
// overage note. Does NOT charge anything itself; that happens in the
// nightly job below. If the hospital has no payment method on file yet,
// this is still recorded (charge_status stays 'pending') — nothing is
// lost, it just waits for a payment method before it can be charged.
async function recordOverageEntry(hospitalAccountId, patientRecordId) {
  const result = await pool.query(
    `INSERT INTO overage_entries (hospital_account_id, patient_record_id)
     VALUES ($1, $2)
     RETURNING id, created_at`,
    [hospitalAccountId, patientRecordId]
  );
  return result.rows[0];
}

// Applies admin_restricted_at if a hospital has pending overage AND no
// payment method — this is the state that gates administrative features
// (see middleware/adminRestriction.js). Called after recording an
// overage entry, and again by the nightly job for any hospital whose
// charge attempt failed.
async function applyRestrictionIfNeeded(hospitalAccountId) {
  const pending = await pool.query(
    `SELECT COUNT(*) AS count FROM overage_entries WHERE hospital_account_id = $1 AND charge_status IN ('pending', 'failed', 'no_payment_method')`,
    [hospitalAccountId]
  );
  if (Number(pending.rows[0].count) === 0) return;

  const hasMethod = await hasPaymentMethod(hospitalAccountId);
  if (hasMethod) return; // a payment method exists — the nightly job will attempt to clear this, don't restrict pre-emptively

  await pool.query(
    `UPDATE accounts SET admin_restricted_at = COALESCE(admin_restricted_at, now()) WHERE id = $1`,
    [hospitalAccountId]
  );
}

async function clearRestriction(hospitalAccountId) {
  await pool.query(`UPDATE accounts SET admin_restricted_at = NULL WHERE id = $1`, [hospitalAccountId]);
}

// Real Razorpay charge call — still NOT built, but the reason changed
// (2026-08-22). Real test-mode RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET are
// now configured (see config/index.js) — that part is genuinely ready.
// What's blocking the actual implementation: this sandbox's network
// policy blocks api.razorpay.com AND razorpay.com entirely (confirmed via
// the agent proxy's own status endpoint — a "policy denial," not a bug to
// route around), so there's no way to check the current, exact request/
// response shape of Razorpay's recurring/token charge endpoint against
// their real docs from here. Writing this from memory alone, unverified,
// for something that moves real money, is exactly the kind of guess this
// backend's honesty standard (see license verification, notification
// delivery) exists to avoid — a subtly wrong implementation that LOOKS
// finished is worse than an honest stub. There is also a bigger
// structural gap underneath this either way: nothing in this app yet
// lets a hospital actually save a payment method in the first place (see
// savePaymentMethod() above — it exists but nothing calls it), which
// itself needs a real Razorpay Checkout flow. Implement this once
// something with normal internet access can reach Razorpay's docs.
async function attemptRazorpayCharge(razorpayCustomerId, razorpayPaymentMethodId, amountPaise) {
  if (!config.razorpayKeyId || !config.razorpayKeySecret) {
    throw new Error(
      "attemptRazorpayCharge() is not wired to a real Razorpay charge call yet, and RAZORPAY_KEY_ID/" +
      "RAZORPAY_KEY_SECRET aren't configured either. Overage entries are tracked correctly " +
      "(see recordOverageEntry()) but nothing actually charges a card until this is implemented."
    );
  }
  throw new Error(
    "attemptRazorpayCharge() still needs implementing even with real Razorpay keys configured — see the " +
    "comment above this function for exactly why it wasn't done yet."
  );
}

// Nightly job entry point (see db/runNightlyOverageBilling.js for the
// standalone script wrapper). For every hospital with pending overage
// entries: if they have a payment method, attempt to charge for the
// night's entries and mark them charged/failed accordingly; if they
// don't, mark those entries 'no_payment_method' and ensure the account
// is restricted. Groups entries by hospital so one hospital's failure
// doesn't affect another's.
async function runNightlyBilling() {
  const hospitalsWithPending = await pool.query(
    `SELECT DISTINCT hospital_account_id FROM overage_entries WHERE charge_status IN ('pending', 'failed')`
  );

  const results = [];
  for (const row of hospitalsWithPending.rows) {
    const hospitalId = row.hospital_account_id;
    const pendingEntries = await pool.query(
      `SELECT id FROM overage_entries WHERE hospital_account_id = $1 AND charge_status IN ('pending', 'failed')`,
      [hospitalId]
    );
    const count = pendingEntries.rows.length;

    const methodResult = await pool.query(`SELECT razorpay_customer_id, razorpay_payment_method_id FROM payment_methods WHERE account_id = $1`, [hospitalId]);
    if (methodResult.rows.length === 0) {
      await pool.query(
        `UPDATE overage_entries SET charge_status = 'no_payment_method' WHERE hospital_account_id = $1 AND charge_status IN ('pending', 'failed')`,
        [hospitalId]
      );
      await applyRestrictionIfNeeded(hospitalId);
      results.push({ hospitalId, count, outcome: "no_payment_method" });
      continue;
    }

    const { razorpay_customer_id, razorpay_payment_method_id } = methodResult.rows[0];
    const tierResult = await pool.query(`SELECT hospital_plan_tier FROM accounts WHERE id = $1`, [hospitalId]);
    const overageRate = getOverageRatePaise(tierResult.rows[0]?.hospital_plan_tier);
    const amountPaise = count * overageRate;
    try {
      await attemptRazorpayCharge(razorpay_customer_id, razorpay_payment_method_id, amountPaise);
      await pool.query(
        `UPDATE overage_entries SET charge_status = 'charged', billed_at = now() WHERE hospital_account_id = $1 AND charge_status IN ('pending', 'failed')`,
        [hospitalId]
      );
      await clearRestriction(hospitalId);
      results.push({ hospitalId, count, amountPaise, outcome: "charged" });
    } catch (err) {
      await pool.query(
        `UPDATE overage_entries SET charge_status = 'failed' WHERE hospital_account_id = $1 AND charge_status IN ('pending', 'failed')`,
        [hospitalId]
      );
      await applyRestrictionIfNeeded(hospitalId);
      results.push({ hospitalId, count, outcome: "charge_failed", error: err.message });
    }
  }
  return results;
}

module.exports = {
  hasPaymentMethod,
  savePaymentMethod,
  recordOverageEntry,
  applyRestrictionIfNeeded,
  clearRestriction,
  runNightlyBilling,
  getOverageRatePaise,
  OVERAGE_RATE_PAISE_BY_TIER,
  createRazorpaySetupOrder,
  verifyRazorpayPaymentSignature,
  fetchRazorpayPaymentToken,
  PAYMENT_METHOD_SETUP_AMOUNT_PAISE,
};
