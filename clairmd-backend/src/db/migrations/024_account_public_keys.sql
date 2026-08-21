-- ---------------------------------------------------------------------------
-- Per-account RSA-OAEP public key, used only for co-admin key-wrap crypto
-- (see routes/coadmin.js and record_key_wraps in 005_record_key_wraps.sql).
-- Only the PUBLIC half is ever stored here — the matching private key is
-- generated and kept entirely client-side (see ClairMDEHR.jsx's
-- getOrCreateKeyPair), same trust model as every other encrypted artifact
-- in this schema: the backend can route/store it, never decrypt anything
-- with it. Nullable — most accounts (patients not using co-admin, care
-- team members, hospitals) never need one.
-- ---------------------------------------------------------------------------

ALTER TABLE accounts ADD COLUMN public_key TEXT;
