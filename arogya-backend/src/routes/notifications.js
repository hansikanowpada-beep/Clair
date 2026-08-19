const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Poll-based in-app notifications (list/mark-read) plus device-token
// registration for real push delivery — see services/notifications.js
// for what actually sends a push once a token is registered here.

router.get("/", requireAuth, async (req, res) => {
  const unreadOnly = req.query.unread === "true";
  const result = await pool.query(
    unreadOnly
      ? `SELECT id, notification_type, payload, created_at, read_at
         FROM notifications WHERE recipient_account_id = $1 AND read_at IS NULL
         ORDER BY created_at DESC`
      : `SELECT id, notification_type, payload, created_at, read_at
         FROM notifications WHERE recipient_account_id = $1
         ORDER BY created_at DESC LIMIT 100`,
    [req.account.id]
  );
  res.json({ notifications: result.rows });
});

router.post("/:id/read", requireAuth, async (req, res) => {
  const result = await pool.query(
    `UPDATE notifications SET read_at = now()
     WHERE id = $1 AND recipient_account_id = $2 AND read_at IS NULL
     RETURNING id, read_at`,
    [req.params.id, req.account.id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Notification not found or already read." });
  }
  res.json({ notification: result.rows[0] });
});

// Client calls this once it has an FCM token (after requesting
// notification permission and initializing Firebase on-device). Re-
// registering the same token just bumps last_seen_at rather than erroring
// — a client re-sending its token on every app open is normal, not a bug.
const registerTokenSchema = z.object({ fcmToken: z.string().min(1) });

router.post("/device-token", requireAuth, async (req, res) => {
  const parsed = registerTokenSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "fcmToken is required." });

  const result = await pool.query(
    `INSERT INTO device_tokens (account_id, fcm_token)
     VALUES ($1, $2)
     ON CONFLICT (fcm_token) DO UPDATE SET account_id = $1, last_seen_at = now()
     RETURNING id, registered_at`,
    [req.account.id, parsed.data.fcmToken]
  );
  res.status(201).json({ registered: true, deviceToken: result.rows[0] });
});

// Client calls this on logout / notification opt-out, so a stale or
// no-longer-wanted token stops receiving pushes.
router.delete("/device-token", requireAuth, async (req, res) => {
  const parsed = registerTokenSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "fcmToken is required." });

  await pool.query(
    `DELETE FROM device_tokens WHERE account_id = $1 AND fcm_token = $2`,
    [req.account.id, parsed.data.fcmToken]
  );
  res.json({ removed: true });
});

module.exports = router;
