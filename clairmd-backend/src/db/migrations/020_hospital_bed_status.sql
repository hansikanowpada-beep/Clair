-- ---------------------------------------------------------------------------
-- Hospital bed availability — one row per hospital account, self-managed.
-- Pure operational status (a hospital-set number), no clinical content.
-- ---------------------------------------------------------------------------

CREATE TABLE hospital_bed_status (
    hospital_account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    total_beds          INTEGER NOT NULL DEFAULT 0,
    available_beds      INTEGER NOT NULL DEFAULT 0,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
