-- ---------------------------------------------------------------------------
-- Lab orders — structured, task-scoped, plaintext test metadata (which
-- test, which category, its status) tied to a patient_record_index row.
-- ---------------------------------------------------------------------------
-- Unlike patient_record_content (the encrypted note blob), a lab order is
-- deliberately NOT encrypted, for the same reason care_team_instructions
-- (007_care_team_instructions.sql) already stores a plaintext
-- diagnosis_summary: the whole point of an order is that a party without
-- chart access — a lab tech, a hospital's lab system, or just the ordering
-- doctor checking status later — needs to read "what test, what category,
-- is it done" without holding any decryption key. test_name and category
-- are bounded, structured metadata (mirroring the frontend's fixed
-- DIAGNOSIS_META test lists), not free-text clinical narrative — the same
-- line schema.sql's header comment already draws for care_team_
-- instructions.result_note is the one free-text field here and stays
-- brief and doctor/lab-entered, same shape as instruction_text there.
CREATE TYPE lab_order_status AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE lab_order_category AS ENUM ('blood', 'urine', 'radiological', 'microbiological', 'immunological');

CREATE TABLE lab_orders (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_record_id   UUID NOT NULL REFERENCES patient_record_index(id) ON DELETE CASCADE,
    ordering_doctor_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    category            lab_order_category NOT NULL,
    test_name           TEXT NOT NULL,
    status              lab_order_status NOT NULL DEFAULT 'pending',
    result_note         TEXT,                    -- brief, plaintext — see comment above
    ordered_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at        TIMESTAMPTZ
);

CREATE INDEX idx_lab_orders_record ON lab_orders (patient_record_id);
CREATE INDEX idx_lab_orders_doctor_pending ON lab_orders (ordering_doctor_id) WHERE status = 'pending';
