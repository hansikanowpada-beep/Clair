const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");
const { requireAuth, requireAccountType } = require("../middleware/auth");

const router = express.Router();

// Doctor specialty-feed posts patients can view and react to. Plaintext by
// design — see schema.sql's comment on feed_posts. KNOWN SIMPLIFICATION:
// GET / below returns ALL non-expired posts platform-wide to any
// authenticated account, not scoped to "doctors this patient follows" —
// no follow-relationship exists in this backend yet; see the same note in
// schema.sql for why that's flagged rather than silently assumed built.

const DOCTOR_TYPES = ["individual_doctor", "hospital_doctor"];
const KINDS = ["update", "achievement", "video"];

const createSchema = z.object({
  kind: z.enum(KINDS).optional(),
  text: z.string().min(1),
  thumbnailUrl: z.string().url().optional(),
});

router.post("/", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid post payload.", details: parsed.error.flatten() });

  const result = await pool.query(
    `INSERT INTO feed_posts (doctor_id, kind, text, thumbnail_url)
     VALUES ($1, COALESCE($2, 'update'), $3, $4)
     RETURNING id, doctor_id, kind, text, thumbnail_url, pinned, created_at`,
    [req.account.id, parsed.data.kind || null, parsed.data.text, parsed.data.thumbnailUrl || null]
  );
  res.status(201).json({ post: result.rows[0] });
});

// Platform-wide feed (see the simplification note above), non-expired only
// (each doctor's own feed_post_expiry_months setting), newest pinned-first,
// with like/dislike counts aggregated at read time and the caller's own
// reaction (if any) so the client can show "you reacted" state.
router.get("/", requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT
       p.id, p.kind, p.text, p.thumbnail_url, p.pinned, p.created_at,
       p.doctor_id, a.display_name AS doctor_name, a.specialty AS doctor_specialty,
       COALESCE(SUM(CASE WHEN r.reaction = 'like' THEN 1 ELSE 0 END), 0)::int AS likes,
       COALESCE(SUM(CASE WHEN r.reaction = 'dislike' THEN 1 ELSE 0 END), 0)::int AS dislikes,
       mine.reaction AS my_reaction
     FROM feed_posts p
     JOIN accounts a ON a.id = p.doctor_id
     LEFT JOIN feed_post_reactions r ON r.post_id = p.id
     LEFT JOIN feed_post_reactions mine ON mine.post_id = p.id AND mine.account_id = $1
     WHERE p.created_at > now() - (a.feed_post_expiry_months || ' months')::interval
     GROUP BY p.id, a.display_name, a.specialty, mine.reaction
     ORDER BY p.pinned DESC, p.created_at DESC`,
    [req.account.id]
  );
  res.json({ posts: result.rows });
});

// This doctor's own posts, including expired ones — powers MyPostsPanel.
router.get("/mine", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const result = await pool.query(
    `SELECT id, kind, text, thumbnail_url, pinned, created_at
     FROM feed_posts WHERE doctor_id = $1 ORDER BY created_at DESC`,
    [req.account.id]
  );
  res.json({ posts: result.rows });
});

// The doctor's own feed_post_expiry_months setting (how long their posts
// stay visible before the GET / listing above filters them out).
// Registered before the /:id routes below — Express matches in
// registration order, and "settings" would otherwise be swallowed as an
// :id by the PATCH /:id route.
router.get("/settings", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const result = await pool.query(`SELECT feed_post_expiry_months FROM accounts WHERE id = $1`, [req.account.id]);
  res.json({ feedPostExpiryMonths: result.rows[0].feed_post_expiry_months });
});

const settingsSchema = z.object({ feedPostExpiryMonths: z.number().int().min(1).max(60) });

router.patch("/settings", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "feedPostExpiryMonths must be an integer between 1 and 60." });

  await pool.query(`UPDATE accounts SET feed_post_expiry_months = $1 WHERE id = $2`, [parsed.data.feedPostExpiryMonths, req.account.id]);
  res.json({ feedPostExpiryMonths: parsed.data.feedPostExpiryMonths });
});

const updateSchema = z.object({
  text: z.string().min(1).optional(),
  pinned: z.boolean().optional(),
});

router.patch("/:id", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid update payload.", details: parsed.error.flatten() });

  const result = await pool.query(
    `UPDATE feed_posts SET text = COALESCE($1, text), pinned = COALESCE($2, pinned)
     WHERE id = $3 AND doctor_id = $4
     RETURNING id, kind, text, thumbnail_url, pinned, created_at`,
    [parsed.data.text || null, parsed.data.pinned ?? null, req.params.id, req.account.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "Post not found." });
  res.json({ post: result.rows[0] });
});

router.delete("/:id", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const result = await pool.query(
    `DELETE FROM feed_posts WHERE id = $1 AND doctor_id = $2 RETURNING id`,
    [req.params.id, req.account.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "Post not found." });
  res.json({ deleted: true });
});

// Toggle react: same reaction sent again removes it; a different reaction
// replaces it; no prior reaction inserts it. One row per (post, account)
// enforced by the table's own primary key, not just app-level logic.
const reactSchema = z.object({ reaction: z.enum(["like", "dislike"]) });

router.post("/:id/react", requireAuth, async (req, res) => {
  const parsed = reactSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "reaction must be 'like' or 'dislike'." });

  const postExists = await pool.query(`SELECT 1 FROM feed_posts WHERE id = $1`, [req.params.id]);
  if (postExists.rows.length === 0) return res.status(404).json({ error: "Post not found." });

  const existing = await pool.query(
    `SELECT reaction FROM feed_post_reactions WHERE post_id = $1 AND account_id = $2`,
    [req.params.id, req.account.id]
  );

  if (existing.rows.length > 0 && existing.rows[0].reaction === parsed.data.reaction) {
    await pool.query(`DELETE FROM feed_post_reactions WHERE post_id = $1 AND account_id = $2`, [req.params.id, req.account.id]);
    return res.json({ reaction: null });
  }

  await pool.query(
    `INSERT INTO feed_post_reactions (post_id, account_id, reaction)
     VALUES ($1, $2, $3)
     ON CONFLICT (post_id, account_id) DO UPDATE SET reaction = $3, reacted_at = now()`,
    [req.params.id, req.account.id, parsed.data.reaction]
  );
  res.json({ reaction: parsed.data.reaction });
});

module.exports = router;
