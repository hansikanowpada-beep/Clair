const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Minimal-disclosure account search — powers "pick a real doctor to refer
// to" and "pick a real care-team member to instruction" pickers in the
// frontend. Returns only id/display_name/specialty/account_type, never
// email/phone: enough to identify who you're picking, nothing a directory
// lookup shouldn't hand out. Requires auth (any account type) but is not
// scoped to the caller's own hospital/affiliations — narrowing that is a
// real feature (e.g. "only show doctors at hospitals I'm affiliated
// with"), not built here; flagged rather than silently assumed.

const SEARCHABLE_TYPES = ["individual_doctor", "hospital_doctor", "care_team_member"];

const querySchema = z.object({
  q: z.string().max(200).optional(),
  types: z.string().optional(),
});

router.get("/", requireAuth, async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid query." });

  const q = (parsed.data.q || "").trim();
  const requestedTypes = parsed.data.types ? parsed.data.types.split(",") : ["individual_doctor", "hospital_doctor"];
  const types = requestedTypes.filter((t) => SEARCHABLE_TYPES.includes(t));
  if (types.length === 0) {
    return res.status(400).json({ error: `types must include at least one of: ${SEARCHABLE_TYPES.join(", ")}` });
  }
  // Avoids a full-table scan on an empty/near-empty query — the client is
  // expected to wait for at least 2 characters before calling this.
  if (q.length < 2) return res.json({ accounts: [] });

  const result = await pool.query(
    `SELECT id, display_name, specialty, account_type
     FROM accounts
     WHERE account_type = ANY($1) AND deactivated_at IS NULL AND id != $2
       AND (display_name ILIKE $3 OR specialty ILIKE $3)
     ORDER BY display_name ASC
     LIMIT 20`,
    [types, req.account.id, `%${q}%`]
  );
  res.json({ accounts: result.rows });
});

module.exports = router;
