-- ---------------------------------------------------------------------------
-- Referral routing — metadata only. No clinical content in the row itself;
-- the receiving doctor pulls patient context in-app after opening, per the
-- "no clinical content in any OS push payload" rule.
-- ---------------------------------------------------------------------------

CREATE TYPE referral_status AS ENUM ('sent', 'acknowledged', 'declined');

CREATE TABLE referrals (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_doctor_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    to_doctor_id        UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    patient_record_id   UUID NOT NULL REFERENCES patient_record_index(id) ON DELETE CASCADE,
    reason_summary       TEXT,                    -- short, non-sensitive routing note only
    status               referral_status NOT NULL DEFAULT 'sent',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at        TIMESTAMPTZ
);

CREATE INDEX idx_referrals_to_doctor ON referrals (to_doctor_id, status);
