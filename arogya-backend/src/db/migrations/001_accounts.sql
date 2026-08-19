-- =============================================================================
-- Arogya Clinic — Platform Database Schema
-- =============================================================================
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

CREATE TYPE account_type AS ENUM ('hospital', 'individual_doctor', 'hospital_doctor', 'patient', 'care_team_member');
CREATE TYPE plan_tier AS ENUM ('free', 'paid_solo', 'paid_clinic', 'paid_hospital');

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
    two_factor_enabled  BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deactivated_at      TIMESTAMPTZ              -- soft delete; see offboarding checklist logic
);

CREATE INDEX idx_accounts_email ON accounts (email);
CREATE INDEX idx_accounts_type ON accounts (account_type);

