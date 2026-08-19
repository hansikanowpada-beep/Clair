-- ---------------------------------------------------------------------------
-- Google Drive connection — stores ONLY OAuth tokens + folder pointer.
-- The actual patient data lives inside that Drive folder, encrypted,
-- and this backend never reads its contents.
-- ---------------------------------------------------------------------------

CREATE TABLE drive_connections (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id          UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    drive_account_email TEXT NOT NULL,           -- which Google account is linked (may be a dedicated professional account)
    refresh_token_enc   TEXT NOT NULL,           -- encrypted at rest (see services/secretsEncryption.js)
    app_folder_id       TEXT NOT NULL,           -- the dedicated, non-descriptive app folder in that Drive
    connected_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at          TIMESTAMPTZ,
    UNIQUE (account_id)
);
