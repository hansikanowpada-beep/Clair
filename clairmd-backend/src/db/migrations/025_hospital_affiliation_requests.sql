-- ---------------------------------------------------------------------------
-- Doctor-initiated hospital affiliation requests. hospital_affiliations
-- (014_hospital_affiliations.sql) only ever supported the hospital adding
-- a doctor directly — the hospital is trusted, no approval step needed,
-- per that migration's own comment. There was no way for a doctor to
-- request the link from their own side, and letting a doctor unilaterally
-- insert into hospital_affiliations would let them bill notes against ANY
-- hospital's plan without that hospital's consent — a real billing/
-- security hole, not just a missing convenience.
--
-- This table is the doctor-initiated half: a request stays 'pending'
-- until the hospital explicitly approves it (see routes/
-- hospitalAffiliations.js's /requests/:id/approve), at which point a real
-- hospital_affiliations row gets created the same way the hospital's own
-- direct-add flow does. Declining leaves no lasting record beyond the
-- request's own status.
-- ---------------------------------------------------------------------------

CREATE TYPE affiliation_request_status AS ENUM ('pending', 'approved', 'declined');

CREATE TABLE hospital_affiliation_requests (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_account_id   UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    hospital_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    status              affiliation_request_status NOT NULL DEFAULT 'pending',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at        TIMESTAMPTZ,
    -- One live request per doctor/hospital pair — a fresh request after a
    -- decline reuses the same row (resets to 'pending') rather than
    -- piling up duplicates, matching hospital_affiliations' own
    -- re-add-after-revoke pattern.
    UNIQUE (doctor_account_id, hospital_account_id)
);

CREATE INDEX idx_hospital_affiliation_requests_hospital_pending ON hospital_affiliation_requests (hospital_account_id) WHERE status = 'pending';
CREATE INDEX idx_hospital_affiliation_requests_doctor ON hospital_affiliation_requests (doctor_account_id);
