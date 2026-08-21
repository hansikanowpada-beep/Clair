-- Notification queue. This table records WHAT should be delivered and
-- WHETHER it has been — it does not itself deliver anything. No push
-- provider (FCM/APNs) or email sender is wired up yet; see
-- services/notifications.js for the honest stub. This exists so routes
-- that need to notify someone (care-team acknowledgment, new referral,
-- etc.) can enqueue correctly today, with real delivery plugged in later
-- without touching those routes again.
CREATE TYPE notification_type AS ENUM (
    'care_team_instruction_created',
    'care_team_instruction_acknowledged',
    'referral_created',
    'referral_responded'
);

CREATE TABLE notifications (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    notification_type   notification_type NOT NULL,
    -- Small, structured payload only (e.g. { "referralId": "...", "fromDoctorName": "..." })
    -- — never clinical content, same rule as everywhere else in this schema.
    payload             JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    delivered_at        TIMESTAMPTZ,              -- set once a real delivery channel confirms sending
    read_at             TIMESTAMPTZ                -- set when the recipient views it in-app
);

CREATE INDEX idx_notifications_recipient_unread
    ON notifications (recipient_account_id)
    WHERE read_at IS NULL;
