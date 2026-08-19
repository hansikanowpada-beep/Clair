-- =============================================================================
-- Arogya Clinic — Platform Database Schema
-- =============================================================================
-- REFERENCE SNAPSHOT ONLY — this file is not what actually gets applied to
-- the database anymore. The real, versioned source of truth is the
-- migrations/ directory (run via db/migrate.js). This file exists so
-- there's one place to read the whole current schema at a glance without
-- reconstructing it from 11 separate migration files. If you change the
-- schema, add a new file in migrations/ AND update this file to match —
-- letting this drift from migrations/ defeats the point of keeping it.
-- =============================================================================
--
-- CRITICAL DESIGN RULE: this database stores PLATFORM METADATA ONLY.
-- It must NEVER contain patient clinical content (diagnoses, prescriptions,
-- notes, attachments). That data is encrypted client-side and lives in each
-- doctor's own Google Drive. See technical spec section 2-3 for the full
-- rationale. If you find yourself wanting to add a "notes" or "diagnosis"
-- column to any table below, stop — that content does not belong here.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------

CREATE TYPE account_type AS ENUM ('hospital', 'individual_doctor', 'hospital_doctor', 'patient', 'care_team_member', 'admin');
CREATE TYPE plan_tier AS ENUM ('free', 'basic', 'elite');
-- Separate from plan_tier: hospital pricing scales by bed count, not note
-- volume, and 'elite_plus' only ever applies to hospital accounts.
CREATE TYPE hospital_plan_tier AS ENUM ('free', 'basic', 'elite', 'elite_plus');

CREATE TABLE accounts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_type        account_type NOT NULL,
    email               TEXT UNIQUE NOT NULL,
    phone               TEXT,
    password_hash       TEXT NOT NULL,          -- bcrypt hash only, never plaintext
    display_name        TEXT NOT NULL,
    specialty           TEXT,                    -- doctors only
    license_number      TEXT,                    -- doctors only, verified at signup (see routes/auth.js)
    license_verified_at TIMESTAMPTZ,
    plan_tier           plan_tier NOT NULL DEFAULT 'free',
    hospital_plan_tier  hospital_plan_tier,      -- only meaningful when account_type = 'hospital'; NULL otherwise
    bed_count           INTEGER,                 -- only meaningful when account_type = 'hospital'; NULL otherwise
    two_factor_enabled  BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deactivated_at      TIMESTAMPTZ              -- soft delete; see offboarding checklist logic
);

CREATE INDEX idx_accounts_email ON accounts (email);
CREATE INDEX idx_accounts_type ON accounts (account_type);

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

-- ---------------------------------------------------------------------------
-- Patient records — index/pointer only. The record ID here maps to an
-- encrypted file in the doctor's Drive; NOTHING clinical is stored here.
-- ---------------------------------------------------------------------------

CREATE TABLE patient_record_index (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    primary_doctor_id   UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    patient_account_id  UUID REFERENCES accounts(id) ON DELETE SET NULL,
    drive_file_id        TEXT NOT NULL,          -- pointer into the doctor's encrypted Drive folder
    -- Which billing context this note counts against: the doctor's own
    -- account (personal practice) or a hospital account (if created under
    -- an active hospital_affiliations link) — see that table's comment.
    -- primary_doctor_id above is always the actual doctor regardless.
    billing_context_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_patient_record_doctor ON patient_record_index (primary_doctor_id);

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

-- ---------------------------------------------------------------------------
-- Co-admin assignment — one co-admin doctor per primary doctor at a time.
-- ---------------------------------------------------------------------------

CREATE TABLE co_admin_assignments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    primary_doctor_id   UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    co_admin_doctor_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    assigned_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at          TIMESTAMPTZ,
    UNIQUE (primary_doctor_id)
);

-- ---------------------------------------------------------------------------
-- Care team instruction queue — task-scoped, NO chart/key access.
-- Deliberately does not require patient consent (see technical spec §3.4).
-- ---------------------------------------------------------------------------

CREATE TABLE care_team_instructions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_doctor_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    to_care_team_id     UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    patient_record_id   UUID NOT NULL REFERENCES patient_record_index(id) ON DELETE CASCADE,
    patient_display_name TEXT NOT NULL,          -- shown in the scoped view; not the full chart
    diagnosis_summary   TEXT,                     -- brief, doctor-entered — not the full record
    bed_number          TEXT,
    instruction_text    TEXT NOT NULL,
    acknowledged_at      TIMESTAMPTZ,             -- set when the care team member taps "OK"
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_care_team_pending ON care_team_instructions (to_care_team_id) WHERE acknowledged_at IS NULL;

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

-- ---------------------------------------------------------------------------
-- Billing — subscription status only, no payment card data (that lives with
-- the payment processor, e.g. Razorpay/Stripe — never stored here).
-- ---------------------------------------------------------------------------

CREATE TABLE billing_events (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id          UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    plan_tier           plan_tier NOT NULL,
    amount_paise        BIGINT,                  -- store in paise (integer) to avoid float rounding issues
    payment_reference    TEXT,                    -- external processor's reference ID only
    occurred_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tracked separately per note type since the free tier's limits differ:
-- 5 ICU/Ward notes/month, 10 OPD notes/month (see services/tierAccess.js).
-- Reading and editing already-existing records is never restricted by
-- this counter — it only gates creating NEW notes.
CREATE TABLE monthly_usage_counters (
    account_id          UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    year_month          TEXT NOT NULL,            -- 'YYYY-MM'
    icu_ward_entries    INTEGER NOT NULL DEFAULT 0,
    opd_entries         INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (account_id, year_month)
);

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
    reason              TEXT NOT NULL,            -- client-supplied; locked to 4 values by routes/emergencyProfile.js's zod schema, not enforced at the DB level (kept as TEXT for flexibility if the list changes)
    accessed_at         TIMESTAMPTZ NOT NULL,      -- when the unlock actually happened on-device, not when reported
    reported_at         TIMESTAMPTZ NOT NULL DEFAULT now() -- when this backend first heard about it
);

CREATE INDEX idx_emergency_access_events_patient
    ON emergency_access_events (patient_account_id, accessed_at DESC);

-- ---------------------------------------------------------------------------
-- Hospital affiliations + dual-practice support
-- ---------------------------------------------------------------------------
-- Reflects a real pattern: a doctor works hospital shifts AND runs their
-- own private clinic. One account, two billing contexts — see
-- patient_record_index.billing_context_id above for how a given note
-- picks which one it counts against.
CREATE TABLE hospital_affiliations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_account_id   UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    hospital_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    joined_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at          TIMESTAMPTZ,
    UNIQUE (doctor_account_id, hospital_account_id)
);

CREATE INDEX idx_hospital_affiliations_doctor ON hospital_affiliations (doctor_account_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_hospital_affiliations_hospital ON hospital_affiliations (hospital_account_id) WHERE revoked_at IS NULL;
