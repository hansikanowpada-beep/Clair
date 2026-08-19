const express = require("express");
const { google } = require("googleapis");
const { z } = require("zod");
const pool = require("../db/pool");
const config = require("../config");
const { requireAuth } = require("../middleware/auth");
const secrets = require("../services/secretsEncryption");

const router = express.Router();

// IMPORTANT: this router never reads the CONTENTS of a doctor's Drive
// files. It only (a) manages the OAuth connection, (b) creates the
// dedicated app folder, and (c) records backup telemetry (metadata only —
// see schema.sql). The actual patient data upload/download/decrypt happens
// client-side, directly between the doctor's device and the Google Drive
// API, using the access token this flow provides — it never passes through
// this backend's own request body.

function getOAuthClient() {
  return new google.auth.OAuth2(config.google.clientId, config.google.clientSecret, config.google.redirectUri);
}

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file"; // file-scope only — never broad Drive access

// Step 1: doctor clicks "Connect Google Drive" — redirect them here.
router.get("/oauth/start", requireAuth, (req, res) => {
  const oauth2Client = getOAuthClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline", // needed to get a refresh_token for unattended midnight backups
    prompt: "consent",
    scope: [DRIVE_SCOPE],
    state: req.account.id, // ties the callback back to the doctor's account
  });
  res.json({ authUrl: url });
});

// Step 2: Google redirects back here after the doctor grants consent.
router.get("/oauth/callback", async (req, res) => {
  const { code, state: accountId } = req.query;
  if (!code || !accountId) {
    return res.status(400).send("Missing authorization code or account reference.");
  }

  try {
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.refresh_token) {
      // Happens if the doctor previously connected and Google doesn't
      // re-issue a refresh token. In production, detect this and prompt
      // a re-consent with prompt=consent (already set above) rather than
      // silently failing.
      return res.status(400).send("Could not obtain a refresh token. Please try connecting again.");
    }
    oauth2Client.setCredentials(tokens);

    const driveClient = google.drive({ version: "v3", auth: oauth2Client });
    const driveEmail = await getDriveAccountEmail(oauth2Client);
    const folderId = await createOrFindAppFolder(driveClient);

    const encryptedRefreshToken = secrets.encrypt(tokens.refresh_token);

    await pool.query(
      `INSERT INTO drive_connections (account_id, drive_account_email, refresh_token_enc, app_folder_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (account_id) DO UPDATE
         SET drive_account_email = EXCLUDED.drive_account_email,
             refresh_token_enc = EXCLUDED.refresh_token_enc,
             app_folder_id = EXCLUDED.app_folder_id,
             revoked_at = NULL`,
      [accountId, driveEmail, encryptedRefreshToken, folderId]
    );

    // Real deployment: redirect to the app's "Drive connected" success screen.
    return res.send("Google Drive connected successfully. You can close this window.");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Drive OAuth callback error:", err);
    return res.status(500).send("Something went wrong connecting Google Drive. Please try again.");
  }
});

// Non-descriptive folder name by design — see technical spec §2.1.
const APP_FOLDER_NAME = ".arogya-clinic-data";

async function createOrFindAppFolder(driveClient) {
  const existing = await driveClient.files.list({
    q: `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });
  if (existing.data.files.length > 0) return existing.data.files[0].id;

  const created = await driveClient.files.create({
    requestBody: { name: APP_FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" },
    fields: "id",
  });
  return created.data.id;
}

async function getDriveAccountEmail(oauth2Client) {
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  return data.email;
}

// --- Backup status telemetry --------------------------------------------
// Called by the client app after each backup attempt (midnight automatic,
// or the on-demand "Back up now" button). Metadata only, per schema.sql.

const backupEventSchema = z.object({
  status: z.enum(["success", "failed", "in_progress"]),
  fileSizeBytes: z.number().int().nonnegative().optional(),
  driveQuotaUsedBytes: z.number().int().nonnegative().optional(),
  driveQuotaTotalBytes: z.number().int().nonnegative().optional(),
  errorMessage: z.string().max(500).optional(),
});

router.post("/backup-events", requireAuth, async (req, res) => {
  const parsed = backupEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid backup event payload.", details: parsed.error.flatten() });
  }
  const { status, fileSizeBytes, driveQuotaUsedBytes, driveQuotaTotalBytes, errorMessage } = parsed.data;

  await pool.query(
    `INSERT INTO backup_events (account_id, status, file_size_bytes, drive_quota_used_bytes, drive_quota_total_bytes, error_message)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [req.account.id, status, fileSizeBytes || null, driveQuotaUsedBytes || null, driveQuotaTotalBytes || null, errorMessage || null]
  );

  res.status(201).json({ recorded: true });
});

// Doctor-facing "Backup & Storage" status screen data.
router.get("/backup-status", requireAuth, async (req, res) => {
  const latest = await pool.query(
    `SELECT status, file_size_bytes, drive_quota_used_bytes, drive_quota_total_bytes, error_message, occurred_at
     FROM backup_events WHERE account_id = $1 ORDER BY occurred_at DESC LIMIT 1`,
    [req.account.id]
  );
  const connection = await pool.query(
    `SELECT drive_account_email, connected_at, revoked_at FROM drive_connections WHERE account_id = $1`,
    [req.account.id]
  );

  const quotaRow = latest.rows[0];
  const quotaWarning = quotaRow && quotaRow.drive_quota_total_bytes
    ? quotaRow.drive_quota_used_bytes / quotaRow.drive_quota_total_bytes > 0.9
    : false;

  res.json({
    connected: connection.rows.length > 0 && !connection.rows[0].revoked_at,
    driveAccountEmail: connection.rows[0]?.drive_account_email || null,
    lastBackup: latest.rows[0] || null,
    quotaWarning, // powers the ~90%-full warning banner
  });
});

module.exports = router;
