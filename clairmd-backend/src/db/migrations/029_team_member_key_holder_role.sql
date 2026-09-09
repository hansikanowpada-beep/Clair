-- ---------------------------------------------------------------------------
-- Adds 'team_member' as a key-wrap holder role, so a team_memberships row
-- with access_files or access_history granted can hold a real wrapped copy
-- of a record's AES key — same record_key_wraps mechanism co_admin_doctor
-- already uses, just a different holder_role label for bookkeeping and
-- revocation queries. Kept in its own migration file: Postgres won't allow
-- a newly added enum value to be used inside the same transaction that
-- added it, and migrate.js runs each file in its own transaction.
-- ---------------------------------------------------------------------------

ALTER TYPE key_holder_role ADD VALUE 'team_member';
