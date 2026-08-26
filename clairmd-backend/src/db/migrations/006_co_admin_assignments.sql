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
