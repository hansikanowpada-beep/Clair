-- ---------------------------------------------------------------------------
-- Tier restructure (2026-08-18): plan_tier goes from the old placeholder
-- values ('paid_solo', 'paid_clinic', 'paid_hospital') to the real,
-- decided two-tier structure: 'free', 'basic', 'elite'. Also splits the
-- old single monthly usage counter into two separate counters — ICU/Ward
-- notes and OPD notes now have different free-tier caps (5 and 10 per
-- month respectively, per the product decision), so they need to be
-- tracked and checked independently, not lumped into one number.
--
-- Safe to do as a clean type-swap rather than a value-by-value migration
-- because no real doctor accounts exist on this platform yet — if this
-- ever needs to run against real data, add an UPDATE step mapping old
-- values to new ones BEFORE dropping the old type, not after.
-- ---------------------------------------------------------------------------

ALTER TABLE accounts ALTER COLUMN plan_tier DROP DEFAULT;
ALTER TABLE accounts ALTER COLUMN plan_tier TYPE TEXT;
ALTER TABLE billing_events ALTER COLUMN plan_tier TYPE TEXT;

DROP TYPE plan_tier;
CREATE TYPE plan_tier AS ENUM ('free', 'basic', 'elite');

ALTER TABLE accounts ALTER COLUMN plan_tier TYPE plan_tier USING plan_tier::plan_tier;
ALTER TABLE accounts ALTER COLUMN plan_tier SET DEFAULT 'free';
ALTER TABLE billing_events ALTER COLUMN plan_tier TYPE plan_tier USING plan_tier::plan_tier;

-- Split usage tracking: ICU/Ward and OPD notes are counted and capped
-- separately (5/month and 10/month respectively on the free tier — see
-- services/tierAccess.js). The old single full_service_entries column
-- can't distinguish which kind of note was created, so it's replaced
-- rather than reused.
ALTER TABLE monthly_usage_counters DROP COLUMN full_service_entries;
ALTER TABLE monthly_usage_counters ADD COLUMN icu_ward_entries INTEGER NOT NULL DEFAULT 0;
ALTER TABLE monthly_usage_counters ADD COLUMN opd_entries INTEGER NOT NULL DEFAULT 0;
