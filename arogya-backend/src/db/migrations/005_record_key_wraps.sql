-- ---------------------------------------------------------------------------
-- Wrapped encryption keys — three independent wraps per patient record,
-- per the technical spec §3 access model. This table stores the WRAPPED
-- (still-encrypted) key blobs only. The backend can route them but cannot
-- decrypt them — only the holder of the corresponding private key can.
-- ---------------------------------------------------------------------------

CREATE TYPE key_holder_role AS ENUM ('primary_doctor', 'co_admin_doctor', 'patient');

CREATE TABLE record_key_wraps (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_record_id   UUID NOT NULL REFERENCES patient_record_index(id) ON DELETE CASCADE,
    holder_account_id   UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    holder_role         key_holder_role NOT NULL,
    wrapped_key         TEXT NOT NULL,           -- opaque ciphertext; backend never unwraps this
    -- Co-admin access to a specific record is gated by per-patient consent,
    -- NOT a global toggle. If consent_granted is false, this wrap exists
    -- only as a fallback recovery path (primary doctor locked out), not for
    -- day-to-day co-physician access.
    consent_granted     BOOLEAN,                 -- NULL for primary_doctor/patient rows (not applicable)
    consent_recorded_at TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (patient_record_id, holder_account_id)
);
