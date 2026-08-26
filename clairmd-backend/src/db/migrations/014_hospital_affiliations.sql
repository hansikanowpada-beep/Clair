-- ---------------------------------------------------------------------------
-- Hospital affiliations + dual-practice support (2026-08-18)
-- ---------------------------------------------------------------------------
-- Reflects a real pattern in Indian medicine: a doctor often works morning
-- shifts at a multi-specialty hospital AND runs their own private evening
-- clinic. This is ONE person with TWO separate billing contexts, not two
-- people and not a single blended account. A doctor keeps their own
-- individual account and plan_tier (unchanged) — this table only adds an
-- OPTIONAL link to a hospital they're also affiliated with. Which context
-- a given note counts against is decided per-note at creation time (see
-- patient_record_index.billing_context_id below), not baked into the
-- account itself.
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

-- Hospital-specific billing. Deliberately a SEPARATE tier enum from the
-- individual-doctor plan_tier ('free'/'basic'/'elite') rather than adding
-- 'elite_plus' to that shared enum — hospital pricing scales by bed count,
-- not note volume, and is a genuinely different billing model. Only
-- meaningful on accounts where account_type = 'hospital'; NULL on every
-- other account type.
CREATE TYPE hospital_plan_tier AS ENUM ('free', 'basic', 'elite', 'elite_plus');

ALTER TABLE accounts ADD COLUMN hospital_plan_tier hospital_plan_tier;
ALTER TABLE accounts ADD COLUMN bed_count INTEGER;

-- Which billing context a note counts against: the doctor's own personal
-- plan (billing_context_id = the doctor's own account_id, matching
-- primary_doctor_id — the common case, unchanged from before this
-- migration), or a hospital's plan (billing_context_id = the hospital's
-- account_id, only valid if an active hospital_affiliations row links
-- primary_doctor_id to that hospital). primary_doctor_id always stays the
-- actual doctor who made the note either way — this column only decides
-- whose quota/plan it counts against.
ALTER TABLE patient_record_index ADD COLUMN billing_context_id UUID REFERENCES accounts(id) ON DELETE RESTRICT;

-- Backfill: every row created before this migration existed implicitly
-- billed against the doctor's own account (there was no hospital-context
-- option yet) — make that explicit rather than leaving it NULL.
UPDATE patient_record_index SET billing_context_id = primary_doctor_id WHERE billing_context_id IS NULL;
ALTER TABLE patient_record_index ALTER COLUMN billing_context_id SET NOT NULL;
