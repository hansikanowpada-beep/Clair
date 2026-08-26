-- ---------------------------------------------------------------------------
-- Doctor specialty-feed posts — short doctor-authored updates patients can
-- view and react to. Plaintext by design (same reasoning as
-- patient_followups above): the whole point is patients read these
-- directly, not clinical content in the schema.sql sense.
-- ---------------------------------------------------------------------------
-- NOTE — known simplification, flagged rather than silently assumed: the
-- frontend prototype's comment says "patients see posts only from doctors
-- they already follow," but no doctor-follow relationship exists anywhere
-- in this backend yet. GET /api/feed-posts (routes/feedPosts.js) currently
-- returns ALL non-expired posts platform-wide to any authenticated
-- patient — a real "following" gate is a separate feature, not built here.

CREATE TYPE feed_post_kind AS ENUM ('update', 'achievement', 'video');
CREATE TYPE feed_reaction_value AS ENUM ('like', 'dislike');

-- A doctor-level setting (not per-post) controlling how long their posts
-- stay visible before expiring — matches the frontend's postExpiryMonths.
ALTER TABLE accounts ADD COLUMN feed_post_expiry_months INTEGER NOT NULL DEFAULT 6;

CREATE TABLE feed_posts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id           UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    kind                feed_post_kind NOT NULL DEFAULT 'update',
    text                TEXT NOT NULL,
    thumbnail_url       TEXT,                    -- video-kind posts only; opaque URL, not uploaded media
    pinned              BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feed_posts_doctor ON feed_posts (doctor_id, created_at DESC);

-- One reaction per (post, account) — like/dislike counts are computed by
-- aggregating this table at read time rather than maintained as counters
-- on feed_posts, so a changed or withdrawn reaction can never drift out of
-- sync with the displayed count.
CREATE TABLE feed_post_reactions (
    post_id             UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    account_id          UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    reaction            feed_reaction_value NOT NULL,
    reacted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, account_id)
);
