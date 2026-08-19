-- ---------------------------------------------------------------------------
-- Billing — subscription status only, no payment card data (that lives with
-- the payment processor, e.g. Razorpay/Stripe — never stored here).
-- ---------------------------------------------------------------------------

CREATE TABLE billing_events (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id          UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    plan_tier           plan_tier NOT NULL,
    amount_paise        BIGINT,                  -- store in paise (integer) to avoid float rounding issues
    payment_reference    TEXT,                    -- external processor's reference ID only
    occurred_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE monthly_usage_counters (
    account_id          UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    year_month          TEXT NOT NULL,            -- 'YYYY-MM'
    full_service_entries INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (account_id, year_month)
);
