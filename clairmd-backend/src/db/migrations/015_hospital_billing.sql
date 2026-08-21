-- ---------------------------------------------------------------------------
-- Hospital overage billing (2026-08-18)
-- ---------------------------------------------------------------------------
-- Payment method on file. Doctors/hospitals start using the app WITHOUT
-- one — only prompted to add it once they first hit ICU/Ward overage
-- (product decision). This table only ever stores Razorpay's own
-- tokenized customer/method references, never raw card data — same rule
-- as every other secret in this schema (see secretsEncryption.js for the
-- pattern used elsewhere; a Razorpay token isn't sensitive the same way
-- a Drive refresh token is, so it isn't additionally encrypted here, but
-- it is still opaque to this backend beyond routing it back to Razorpay).
CREATE TABLE payment_methods (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id               UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    razorpay_customer_id     TEXT NOT NULL,
    razorpay_payment_method_id TEXT NOT NULL,
    added_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (account_id)
);

-- One row per ICU/Ward note created past a hospital's included quota.
-- This is the ledger the nightly billing job reads — see
-- services/hospitalBilling.js. billed_at is set once a nightly charge
-- attempt has processed this entry (successfully or not — see
-- charge_status); entries are never silently dropped even if the charge
-- fails, so nothing gets lost if a card is declined one night.
CREATE TYPE overage_charge_status AS ENUM ('pending', 'charged', 'failed', 'no_payment_method');

CREATE TABLE overage_entries (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    patient_record_id   UUID NOT NULL REFERENCES patient_record_index(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    charge_status       overage_charge_status NOT NULL DEFAULT 'pending',
    billed_at           TIMESTAMPTZ
);

CREATE INDEX idx_overage_entries_pending
    ON overage_entries (hospital_account_id)
    WHERE charge_status = 'pending';

-- Set when a hospital has unpaid overage AND no successful nightly charge
-- has cleared it — gates ADMINISTRATIVE features only (adding doctors,
-- care-team management, inventory, dashboards). Never gates reading or
-- editing existing patient records, and never gates creating new notes
-- either (see tierAccess.js — overage notes are always still allowed to
-- be created, only billed extra). See middleware/adminRestriction.js.
ALTER TABLE accounts ADD COLUMN admin_restricted_at TIMESTAMPTZ;
