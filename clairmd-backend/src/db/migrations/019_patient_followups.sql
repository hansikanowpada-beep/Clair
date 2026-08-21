-- ---------------------------------------------------------------------------
-- Patient follow-up plans — a doctor's short, structured post-visit plan
-- (check-in interval, what to watch for, diet/physio, precautions, next
-- visit) plus the doctor<->patient message thread built around it.
-- ---------------------------------------------------------------------------
-- Distinct from care_team_instructions (007): that table is a doctor-to-
-- care-team-member task queue with no patient-facing content at all. This
-- one is doctor-to-PATIENT, meant to be read directly by the patient in
-- their own portal — so, same reasoning as care_team_instructions'
-- plaintext diagnosis_summary, this is deliberately plaintext rather than
-- encrypted like patient_record_content: the whole point is the patient
-- reads it without any decryption step. Kept short and plan-level by
-- design (takeaways/precautions/next-visit, not a full chart) — this is
-- not a substitute for the doctor's own clinical record of the encounter.
CREATE TABLE patient_followups (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id           UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    -- Nullable + a captured display name/phone, same shape as
    -- patient_record_index.patient_account_id and care_team_instructions.
    -- patient_display_name — a follow-up plan can exist before the patient
    -- has (or ever gets) a linked account.
    patient_account_id  UUID REFERENCES accounts(id) ON DELETE SET NULL,
    patient_display_name TEXT NOT NULL,
    patient_phone       TEXT,
    interval             TEXT NOT NULL,
    takeaways            TEXT NOT NULL,
    complications        TEXT,
    diet_physio          TEXT,
    precautions          TEXT,
    next_visit           TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_patient_followups_doctor ON patient_followups (doctor_id);
CREATE INDEX idx_patient_followups_patient ON patient_followups (patient_account_id);

-- isAdviceLink/linkExpiresAt mirror the frontend's existing
-- "share a 24h feedback link" pattern (see ClairMDEHR.jsx's sendAdvice) —
-- stored here so the expiry is enforced consistently wherever the thread
-- is read from, not just recomputed ad hoc client-side.
CREATE TYPE followup_message_sender AS ENUM ('doctor', 'patient');

CREATE TABLE patient_followup_messages (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    followup_id         UUID NOT NULL REFERENCES patient_followups(id) ON DELETE CASCADE,
    sender_role         followup_message_sender NOT NULL,
    sender_account_id   UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    text                TEXT NOT NULL,
    is_advice_link      BOOLEAN NOT NULL DEFAULT false,
    link_expires_at     TIMESTAMPTZ,
    sent_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_followup_messages_followup ON patient_followup_messages (followup_id, sent_at);
