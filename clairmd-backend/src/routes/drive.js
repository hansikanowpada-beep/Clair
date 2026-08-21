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

    // The frontend opens this whole OAuth flow in a popup window (see
    // ClairMDEHR.jsx's startDriveConnection) and polls GET /backup-status
    // from the opener to notice when connected=true, rather than this
    // page trying to postMessage back — simpler, and works even if the
    // opener/popup relationship gets awkward across browsers. This just
    // auto-closes the popup once the connection is actually stored, so a
    // doctor doesn't have to manually close it. Falls back to a manual
    // "close this window" instruction for the rare browser that blocks
    // script-initiated window.close() on a window it didn't itself open
    // via a same-origin script.
    return res.send(`<!doctype html><html><body style="font-family:sans-serif;padding:24px;">
      <p>Google Drive connected successfully. This window will close automatically.</p>
      <script>window.close();</script>
    </body></html>`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Drive OAuth callback error:", err);
    return res.status(500).send("Something went wrong connecting Google Drive. Please try again.");
  }
});

// Short-lived Drive access token, minted on demand from the stored
// (encrypted-at-rest) refresh token. This is the one place a Drive
// credential crosses this backend after the initial OAuth exchange — and
// it's still just a token, never file content. The access token this
// returns is scoped to drive.file only (see DRIVE_SCOPE above) and
// typically expires in ~1 hour; the frontend uses it to talk to the Drive
// API directly from the browser (see ClairMDEHR.jsx's uploadEncrypted-
// BlobToDrive/downloadEncryptedBlobFromDrive), the same "content never
// passes through this backend" design as the rest of this router.
router.get("/access-token", requireAuth, async (req, res) => {
  const connection = await pool.query(
    `SELECT refresh_token_enc FROM drive_connections WHERE account_id = $1 AND revoked_at IS NULL`,
    [req.account.id]
  );
  if (connection.rows.length === 0) {
    return res.status(404).json({ error: "Google Drive isn't connected for this account." });
  }

  try {
    const refreshToken = secrets.decrypt(connection.rows[0].refresh_token_enc);
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { token } = await oauth2Client.getAccessToken();
    if (!token) throw new Error("No access token returned.");
    res.json({ accessToken: token, expiresAt: oauth2Client.credentials.expiry_date || null });
  } catch (err) {
    req.log?.error({ err }, "Drive access token refresh failed");
    // Most likely cause: the doctor revoked ClairMD's access from their
    // Google account settings, outside this app entirely — the stored
    // refresh token is then dead and re-connecting is the only fix.
    // Deliberately NOT auto-clearing the drive_connections row here: a
    // transient Google-side error would otherwise silently disconnect a
    // still-valid connection.
    res.status(502).json({ error: "Couldn't get a Google Drive access token — the connection may need to be reconnected." });
  }
});

// Non-descriptive folder name by design — see technical spec §2.1.
const APP_FOLDER_NAME = ".clairmd-clinic-data";

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
    `SELECT drive_account_email, app_folder_id, connected_at, revoked_at FROM drive_connections WHERE account_id = $1`,
    [req.account.id]
  );

  const quotaRow = latest.rows[0];
  const quotaWarning = quotaRow && quotaRow.drive_quota_total_bytes
    ? quotaRow.drive_quota_used_bytes / quotaRow.drive_quota_total_bytes > 0.9
    : false;

  res.json({
    connected: connection.rows.length > 0 && !connection.rows[0].revoked_at,
    driveAccountEmail: connection.rows[0]?.drive_account_email || null,
    // Not sensitive (just a Drive folder id, not a credential) — exposed
    // so the client can upload directly into the right folder without a
    // second lookup. See routes/drive.js's own file-content trust model:
    // this backend still never sees what goes IN that folder.
    appFolderId: connection.rows[0]?.app_folder_id || null,
    lastBackup: latest.rows[0] || null,
    quotaWarning, // powers the ~90%-full warning banner
  });
});

module.exports = router;
