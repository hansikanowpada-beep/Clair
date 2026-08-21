-- ---------------------------------------------------------------------------
-- Emergency access — encrypted, offline-capable profile
-- ---------------------------------------------------------------------------
-- Design decision (2026-08-18): the emergency scoped-view data (NOK
-- contact, blood group, allergies, meds, emergency note, redacted
-- insurance) lives as its OWN small, separately-encrypted blob — NOT as
-- part of a doctor's Drive-held clinical record, and not wrapped with the
-- same key-wrap scheme as patient_record_index. It's encrypted and
-- decrypted entirely on the patient's device, with the key held in the
-- device's own secure hardware storage (Keychain/Keystore), gated by the
-- same fingerprint that unlocks it for a bystander.
--
-- This backend's job is narrow: back up the encrypted blob for durability
-- and multi-device sync. It NEVER holds the decryption key and cannot
-- read the plaintext — encrypted_blob is opaque ciphertext as far as this
-- database is concerned, same trust model as refresh_token_enc on
-- drive_connections. Critically, the emergency READ ITSELF does not
-- require this backend at all — once a device has the blob and the local
-- key cached, unlocking works with zero connectivity, which is the whole
-- point (an emergency is a bad moment to need a network call to succeed).
CREATE TABLE emergency_profiles (
    patient_account_id  UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    encrypted_blob       TEXT NOT NULL,           -- opaque ciphertext; see comment above
    blob_version         INTEGER NOT NULL DEFAULT 1,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Because the actual emergency read can happen fully offline, the misuse
-- protections designed for this feature (mandatory reason, rate-limiting,
-- anomaly detection, NOK "report this") can't all be enforced AT the
-- moment of access. What this table gives instead: an audit trail the
-- client reports once connectivity returns, so every unlock is still
-- logged, reviewable, and rate-limitable after the fact even though it
-- couldn't be gated in real time. This is a real, honest limitation of the
-- offline-first design, not an oversight — see README for how it's
-- surfaced.
CREATE TABLE emergency_access_events (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    reason              TEXT NOT NULL,            -- client-supplied, mandatory; taxonomy not yet fixed, see README
    accessed_at         TIMESTAMPTZ NOT NULL,      -- when the unlock actually happened on-device, not when reported
    reported_at         TIMESTAMPTZ NOT NULL DEFAULT now() -- when this backend first heard about it
);

CREATE INDEX idx_emergency_access_events_patient
    ON emergency_access_events (patient_account_id, accessed_at DESC);
