-- ---------------------------------------------------------------------------
-- Backup status telemetry — METADATA ONLY. No patient content ever touches
-- this table. This is what powers the founder dashboard and the doctor's
-- own "Backup & Storage" status screen (see technical spec §2.3).
-- ---------------------------------------------------------------------------

CREATE TYPE backup_status AS ENUM ('success', 'failed', 'in_progress');

CREATE TABLE backup_events (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id          UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    status              backup_status NOT NULL,
    file_size_bytes     BIGINT,
    drive_quota_used_bytes   BIGINT,
    drive_quota_total_bytes  BIGINT,
    error_message       TEXT,                    -- plain-language, safe to show the doctor directly
    occurred_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_backup_events_account_time ON backup_events (account_id, occurred_at DESC);
