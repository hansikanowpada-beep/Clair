-- ---------------------------------------------------------------------------
-- Feed post approval requests — a doctor asks to post about a specific
-- patient's case; nothing goes live until that patient approves it.
-- ---------------------------------------------------------------------------
-- patient_account_id is nullable, same reasoning as patient_followups
-- (019_patient_followups.sql): this prototype has no step anywhere that
-- links a mock frontend patient to a real backend account, so a request
-- is created addressed to a NAME (patient_display_name), not an account
-- id. It gets CLAIMED — patient_account_id set — only when a genuinely
-- authenticated patient whose own display_name matches actually responds
-- (approve/decline), at which point that response is unambiguously real
-- regardless of how loosely the request itself was addressed.
--
-- Note this uses ALTER TYPE ... ADD VALUE, same as 016_admin_dashboard.sql
-- — works inside a transaction on Postgres 12+ (this migration runner
-- wraps every file in one) but not older versions; not an issue here
-- either way since the new value is only ever used by later, separate
-- transactions (routes/feedPostRequests.js's approve handler), never
-- within this migration itself.
ALTER TYPE feed_post_kind ADD VALUE 'case_highlight';

CREATE TYPE feed_post_request_status AS ENUM ('pending', 'approved', 'declined');

CREATE TABLE feed_post_requests (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id             UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    patient_account_id    UUID REFERENCES accounts(id) ON DELETE SET NULL,
    patient_display_name  TEXT NOT NULL,
    findings              TEXT,
    course                TEXT,
    workup                TEXT,
    status                feed_post_request_status NOT NULL DEFAULT 'pending',
    created_feed_post_id  UUID REFERENCES feed_posts(id) ON DELETE SET NULL,
    requested_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at          TIMESTAMPTZ
);

CREATE INDEX idx_feed_post_requests_doctor ON feed_post_requests (doctor_id);
-- Powers "list my pending requests" for a patient searching by their own
-- display_name — a name match, not a foreign-key join, same caveat as
-- patient_followups' patient_display_name.
CREATE INDEX idx_feed_post_requests_pending_by_name ON feed_post_requests (patient_display_name) WHERE status = 'pending';
