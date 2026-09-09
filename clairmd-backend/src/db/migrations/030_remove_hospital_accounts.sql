-- ---------------------------------------------------------------------------
-- Remove the 'hospital' account type entirely (2026-09-09): the hospital
-- institutional account, its bed-count-scaled Razorpay overage billing, and
-- hospital-doctor affiliations are all gone. 'hospital_doctor' folds into
-- 'individual_doctor' — one doctor account type going forward. Bed
-- availability and inventory management stop being hospital-only and
-- become features any doctor account can use for their own practice (a
-- solo doctor can have a small ward or pharmacy too). ICU/Ward note-taking
-- is no longer hospital-exclusive either — see services/tierAccess.js,
-- where it now counts against the same per-doctor quota as OPD notes
-- instead of a separate bed-count-scaled allowance.
--
-- Same "no real doctor accounts exist on this platform yet" situation as
-- 013_tier_restructure.sql — this is written as a clean removal, not a
-- careful data-preserving migration. If this ever runs against a database
-- with real hospital accounts in it, decide what happens to their data
-- (export first?) before applying this as-is.
-- ---------------------------------------------------------------------------

-- Hospital overage billing — no working Razorpay charge integration was
-- ever finished (services/hospitalBilling.js's attemptRazorpayCharge was
-- always a documented stub), so there's no live billing relationship to
-- carefully unwind here, just ledger tables to drop.
DROP TABLE IF EXISTS overage_entries;
DROP TYPE IF EXISTS overage_charge_status;
DROP TABLE IF EXISTS payment_methods;

-- Hospital-doctor affiliations — the whole "doctor works at a hospital AND
-- runs their own clinic, bills against either" dual-practice model goes
-- away with the hospital account type; every note now always bills against
-- the doctor's own account.
DROP TABLE IF EXISTS hospital_affiliation_requests;
DROP TABLE IF EXISTS hospital_affiliations;

-- admin_restricted_at only ever gated hospital administrative features
-- during unpaid overage (see middleware/adminRestriction.js, being removed
-- alongside this) — dead without overage billing.
ALTER TABLE accounts DROP COLUMN IF EXISTS admin_restricted_at;

-- billing_context_id existed only to let a note bill against a hospital
-- instead of the doctor themselves — with no more "instead of," it's
-- always primary_doctor_id now, so the column is redundant.
ALTER TABLE patient_record_index DROP COLUMN IF EXISTS billing_context_id;

-- Generalize bed status and inventory from hospital-only to any doctor
-- account — same tables and data, just no longer scoped to a disappearing
-- account type. Renamed table (bed_status) since "hospital_bed_status" is
-- no longer an accurate name; inventory_items' own name was never
-- hospital-specific, so only its FK column is renamed.
ALTER TABLE hospital_bed_status RENAME TO bed_status;
ALTER TABLE bed_status RENAME COLUMN hospital_account_id TO doctor_account_id;
ALTER TABLE inventory_items RENAME COLUMN hospital_account_id TO doctor_account_id;

-- Remove hospital accounts themselves. Any bed_status/inventory_items rows
-- they still own cascade-delete along with them (ON DELETE CASCADE on both
-- FKs above) — intentional, since the account itself is being removed.
DELETE FROM accounts WHERE account_type = 'hospital';

-- Fold hospital_doctor into individual_doctor and drop both 'hospital' and
-- 'hospital_doctor' from the enum. Hospital accounts are already gone
-- (previous statement), so the only cast this USING clause needs to handle
-- is hospital_doctor -> individual_doctor; every other existing value
-- passes through unchanged.
ALTER TABLE accounts ALTER COLUMN account_type TYPE TEXT;
DROP TYPE account_type;
CREATE TYPE account_type AS ENUM ('individual_doctor', 'patient', 'care_team_member', 'admin');
ALTER TABLE accounts ALTER COLUMN account_type TYPE account_type
  USING (CASE WHEN account_type = 'hospital_doctor' THEN 'individual_doctor' ELSE account_type END)::account_type;

-- hospital_plan_tier and bed_count only ever fed the bed-count-scaled
-- overage math above — dead now that ICU/Ward shares the individual
-- doctor's own note-count quota instead.
ALTER TABLE accounts DROP COLUMN IF EXISTS hospital_plan_tier;
DROP TYPE IF EXISTS hospital_plan_tier;
ALTER TABLE accounts DROP COLUMN IF EXISTS bed_count;
