const pool = require("../db/pool");
const config = require("../config");

// enqueue() writes to the notifications table (in-app, always works, no
// credentials needed). deliverPending() below is the REAL push/email
// integration — not a stub — built against Firebase Cloud Messaging's
// well-documented HTTP v1 API (via firebase-admin) and standard SMTP (via
// nodemailer).
//
// The push half is now genuinely LIVE-TESTED (2026-08-22), against a real
// Firebase service account: firebase-admin actually obtained a real
// Google OAuth2 access token from this credential (proving the key
// itself is valid), and a send() to a deliberately fake FCM token came
// back as `messaging/invalid-argument` — a TOKEN-shaped rejection, not an
// authentication one — proving the whole path (credential -> Google auth
// -> FCM API call) works and would deliver to any real device token.
// Nothing was actually delivered to a real phone (no real device token
// exists to test with), but every piece up to that last mile is proven.
//
// The email/SMTP half has real Gmail credentials configured (SMTP_HOST=
// smtp.gmail.com + an app password), but is STILL unproven — for a
// different reason than Razorpay. Razorpay was reachable-but-policy-
// blocked (an explicit 403). Gmail's SMTP port (587) is a raw TCP
// connection with a STARTTLS upgrade, not an HTTPS request — the sandbox
// this was attempted from only proxies HTTPS (port 443) traffic; a real
// connection attempt to smtp.gmail.com:587 just hung with no response at
// all, matching the agent proxy's own documented "non-443 ports, raw-TCP"
// unsupported list. So this is an environment limitation, not a sign the
// credentials are wrong. Try it again from an environment with normal
// outbound network access before trusting it.
//
// Until 2026-08-22, nothing ever actually CALLED deliverPending() —
// enqueue() always worked, but no scheduled job existed to attempt
// delivery for what it queued. See db/deliverNotifications.js, the
// missing entry point (mirrors db/runNightlyOverageBilling.js's shape).
//
// Deliberately graceful when unconfigured: if FIREBASE_SERVICE_ACCOUNT_
// JSON or SMTP_* aren't set, deliverPending() logs why and skips rather
// than throwing — so a scheduler calling this on an interval doesn't
// crash every run just because credentials aren't set up yet.

const VALID_TYPES = [
  "care_team_instruction_created",
  "care_team_instruction_acknowledged",
  "referral_created",
  "referral_responded",
];

async function enqueue(recipientAccountId, notificationType, payload = {}) {
  if (!VALID_TYPES.includes(notificationType)) {
    throw new Error(`Unknown notification type: ${notificationType}`);
  }
  const result = await pool.query(
    `INSERT INTO notifications (recipient_account_id, notification_type, payload)
     VALUES ($1, $2, $3)
     RETURNING id, notification_type, payload, created_at`,
    [recipientAccountId, notificationType, JSON.stringify(payload)]
  );
  return result.rows[0];
}

// Human-readable title/body per notification type. Deliberately generic
// (no patient names/diagnoses) — payload only ever holds non-clinical
// routing metadata (see schema.sql's notifications comment), and that
// rule applies here too: nothing clinical belongs in a push payload that
// might show on a lock screen.
function formatMessage(notificationType) {
  switch (notificationType) {
    case "care_team_instruction_created":
      return { title: "New instruction", body: "You have a new care instruction waiting." };
    case "care_team_instruction_acknowledged":
      return { title: "Instruction acknowledged", body: "A care team member acknowledged your instruction." };
    case "referral_created":
      return { title: "New referral", body: "A doctor has referred a patient to you." };
    case "referral_responded":
      return { title: "Referral update", body: "A doctor responded to your referral." };
    default:
      return { title: "ClairMD Clinic", body: "You have a new notification." };
  }
}

let firebaseApp = null;
function getFirebaseApp() {
  if (firebaseApp) return firebaseApp;
  if (!config.firebase.serviceAccountJson) return null;
  // Lazy require — avoids a hard dependency on firebase-admin being
  // installed/configured for deployments that only use email delivery.
  const admin = require("firebase-admin");
  const serviceAccount = JSON.parse(config.firebase.serviceAccountJson);
  firebaseApp = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return firebaseApp;
}

async function sendPush(fcmToken, message) {
  const app = getFirebaseApp();
  if (!app) return { sent: false, reason: "Firebase not configured" };
  const admin = require("firebase-admin");
  try {
    await admin.messaging(app).send({
      token: fcmToken,
      notification: { title: message.title, body: message.body },
    });
    return { sent: true };
  } catch (err) {
    // A token can legitimately go stale (app uninstalled, device reset) —
    // that's an expected failure mode, not a bug. Cleaning up stale
    // tokens automatically here rather than leaving them to fail forever.
    if (err.code === "messaging/registration-token-not-registered") {
      await pool.query(`DELETE FROM device_tokens WHERE fcm_token = $1`, [fcmToken]);
    }
    return { sent: false, reason: err.message };
  }
}

let emailTransporter = null;
function getEmailTransporter() {
  if (emailTransporter) return emailTransporter;
  const { host, port, user, pass } = config.smtp;
  if (!host || !user || !pass) return null;
  const nodemailer = require("nodemailer");
  emailTransporter = nodemailer.createTransport({ host, port, auth: { user, pass } });
  return emailTransporter;
}

async function sendEmail(toAddress, message) {
  const transporter = getEmailTransporter();
  if (!transporter) return { sent: false, reason: "SMTP not configured" };
  try {
    await transporter.sendMail({
      from: config.smtp.from || config.smtp.user,
      to: toAddress,
      subject: message.title,
      text: message.body,
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: err.message };
  }
}

// Attempts delivery for every undelivered notification: push first (to
// every registered device for that account), falling back to email only
// if push wasn't sent to any device. Marks delivered_at as soon as ANY
// channel succeeds — this is "best-effort delivered," not "read," which
// read_at (set separately, in-app) already covers.
async function deliverPending(limit = 100) {
  const pending = await pool.query(
    `SELECT n.id, n.recipient_account_id, n.notification_type, a.email
     FROM notifications n
     JOIN accounts a ON a.id = n.recipient_account_id
     WHERE n.delivered_at IS NULL
     ORDER BY n.created_at ASC
     LIMIT $1`,
    [limit]
  );

  if (pending.rows.length === 0) {
    return { processed: 0, delivered: 0 };
  }

  let delivered = 0;
  for (const row of pending.rows) {
    const message = formatMessage(row.notification_type);
    let anySent = false;

    const tokens = await pool.query(`SELECT fcm_token FROM device_tokens WHERE account_id = $1`, [row.recipient_account_id]);
    for (const t of tokens.rows) {
      const result = await sendPush(t.fcm_token, message);
      if (result.sent) anySent = true;
    }

    if (!anySent && row.email) {
      const result = await sendEmail(row.email, message);
      if (result.sent) anySent = true;
    }

    if (anySent) {
      await pool.query(`UPDATE notifications SET delivered_at = now() WHERE id = $1`, [row.id]);
      delivered++;
    }
  }

  return { processed: pending.rows.length, delivered };
}

module.exports = { enqueue, deliverPending, VALID_TYPES };
