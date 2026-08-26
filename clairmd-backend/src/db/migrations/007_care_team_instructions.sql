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
