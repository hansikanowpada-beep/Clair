-- ---------------------------------------------------------------------------
-- Practice team roster — a doctor's own nurses, duty doctors, lab
-- technicians, pharmacists, and specialists, each granted access to a
-- specific slice of the doctor's patient data rather than the whole chart.
-- Distinct from care_team_instructions (which is a one-way task queue with
-- NO chart access at all) and from co_admin_assignments (a single doctor
-- peer with full-chart access, gated by patient consent). This is a
-- standing roster with fine-grained, per-domain access the doctor controls
-- directly, no patient consent step — same rationale as
-- care_team_instructions §3.4: staff acting under the doctor's own
-- direction, not an independent access grant to another doctor.
-- ---------------------------------------------------------------------------

CREATE TYPE team_role AS ENUM ('admin', 'duty_doctor', 'nurse', 'lab_technician', 'pharmacist', 'specialist');

CREATE TABLE team_memberships (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_account_id   UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    member_account_id   UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    role                team_role NOT NULL,
    -- patient_record_content stores a doctor's entire note (history,
    -- vitals, exam findings, diagnosis/plan, bed, everything) as ONE
    -- encrypted blob per record — there is no per-section split at the
    -- storage or key layer. So Files/Bed/History cannot be granted as
    -- separately-encrypted domains today; access_clinical_record is a
    -- single gate covering all of it, requiring one real key wrap (see
    -- 029_team_member_key_holder_role.sql + routes/teamMembers.js) to
    -- mean anything. A future split of patient_record_content into
    -- independently-encrypted sections could make these separable for
    -- real; until then, don't add access_files/access_bed/access_history
    -- as if they were independent — that would promise a security
    -- boundary this schema can't actually enforce.
    access_clinical_record BOOLEAN NOT NULL DEFAULT false,
    -- Inventory and lab reports are genuinely separate, plaintext tables
    -- (see schema.sql's opening comment) — these two flags are the entire
    -- access grant on their own, checked directly by
    -- middleware/teamAccess.js with no encryption involved.
    access_inventory    BOOLEAN NOT NULL DEFAULT false,
    access_lab_reports  BOOLEAN NOT NULL DEFAULT false,
    invited_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at          TIMESTAMPTZ,
    UNIQUE (doctor_account_id, member_account_id)
);

CREATE INDEX idx_team_memberships_doctor ON team_memberships (doctor_account_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_team_memberships_member ON team_memberships (member_account_id) WHERE revoked_at IS NULL;
