-- ---------------------------------------------------------------------------
-- Device tokens for push notification delivery. Separate from accounts
-- because one account can have multiple devices (phone + tablet), and a
-- token can go stale (app reinstalled, device lost) independently of the
-- account itself — this table's rows come and go, accounts don't.
-- ---------------------------------------------------------------------------

CREATE TABLE device_tokens (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id          UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    fcm_token           TEXT NOT NULL,
    registered_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (fcm_token)
);

CREATE INDEX idx_device_tokens_account ON device_tokens (account_id);
