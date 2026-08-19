-- ---------------------------------------------------------------------------
-- Patient records — index/pointer only. The record ID here maps to an
-- encrypted file in the doctor's Drive; NOTHING clinical is stored here.
-- ---------------------------------------------------------------------------

CREATE TABLE patient_record_index (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    primary_doctor_id   UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    patient_account_id  UUID REFERENCES accounts(id) ON DELETE SET NULL,
    drive_file_id        TEXT NOT NULL,          -- pointer into the doctor's encrypted Drive folder
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_patient_record_doctor ON patient_record_index (primary_doctor_id);
