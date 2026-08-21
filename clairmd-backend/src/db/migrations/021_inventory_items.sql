-- ---------------------------------------------------------------------------
-- Hospital inventory — stock quantities, reorder thresholds, expiry dates.
-- Pure operational/logistics tracking (same framing as the frontend's own
-- comment on this feature): no clinical content, no dosing, no prescribing
-- decisions, so this sits outside any device-classification concern the
-- clinical modules elsewhere in this app stay deliberately within.
-- ---------------------------------------------------------------------------

CREATE TYPE inventory_category AS ENUM ('medication', 'consumable', 'equipment', 'ppe', 'other');

CREATE TABLE inventory_items (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    category            inventory_category NOT NULL DEFAULT 'other',
    quantity            INTEGER NOT NULL DEFAULT 0,
    unit                TEXT NOT NULL DEFAULT 'units',
    reorder_at          INTEGER NOT NULL DEFAULT 0,
    expiry_date         DATE,
    supplier            TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_items_hospital ON inventory_items (hospital_account_id);
