const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { requireTeamAccess } = require("../middleware/teamAccess");

const router = express.Router();

// Self-managed, any doctor account — not hospital-only anymore (a solo
// doctor can run a small pharmacy too). Pure operational/logistics
// tracking, no clinical content — see schema.sql's comment on
// inventory_items. Fully delegable to a team member with access_inventory
// granted (requireTeamAccess handles "is this the owning doctor, or a
// team member with that grant" — see middleware/teamAccess.js); unlike
// lab orders, there's no doctor-exclusive clinical decision here, so every
// route below is open to a granted team member, not just reads.

const CATEGORIES = ["medication", "consumable", "equipment", "ppe", "other"];

const createSchema = z.object({
  doctorAccountId: z.string().uuid().optional(),
  name: z.string().min(1),
  category: z.enum(CATEGORIES).optional(),
  quantity: z.number().int().min(0).optional(),
  unit: z.string().optional(),
  reorderAt: z.number().int().min(0).optional(),
  expiryDate: z.string().optional(), // ISO date string, e.g. "2026-11-30"; empty/absent means no expiry
  supplier: z.string().optional(),
});

router.post("/", requireAuth, requireTeamAccess("access_inventory"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid inventory item payload.", details: parsed.error.flatten() });
  const d = parsed.data;

  const result = await pool.query(
    `INSERT INTO inventory_items (doctor_account_id, name, category, quantity, unit, reorder_at, expiry_date, supplier)
     VALUES ($1, $2, COALESCE($3, 'other'), COALESCE($4, 0), COALESCE($5, 'units'), COALESCE($6, 0), $7, $8)
     RETURNING *`,
    [req.teamAccess.doctorAccountId, d.name, d.category || null, d.quantity ?? null, d.unit || null, d.reorderAt ?? null, d.expiryDate || null, d.supplier || null]
  );
  res.status(201).json({ item: result.rows[0] });
});

router.get("/", requireAuth, requireTeamAccess("access_inventory"), async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM inventory_items WHERE doctor_account_id = $1 ORDER BY name ASC`,
    [req.teamAccess.doctorAccountId]
  );
  res.json({ items: result.rows });
});

const updateSchema = z.object({
  doctorAccountId: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  category: z.enum(CATEGORIES).optional(),
  quantity: z.number().int().min(0).optional(),
  unit: z.string().optional(),
  reorderAt: z.number().int().min(0).optional(),
  expiryDate: z.string().nullable().optional(),
  supplier: z.string().nullable().optional(),
});

router.patch("/:id", requireAuth, requireTeamAccess("access_inventory"), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid update payload.", details: parsed.error.flatten() });
  const d = parsed.data;

  const result = await pool.query(
    `UPDATE inventory_items SET
       name = COALESCE($1, name),
       category = COALESCE($2, category),
       quantity = COALESCE($3, quantity),
       unit = COALESCE($4, unit),
       reorder_at = COALESCE($5, reorder_at),
       expiry_date = CASE WHEN $6::boolean THEN $7::date ELSE expiry_date END,
       supplier = CASE WHEN $8::boolean THEN $9 ELSE supplier END,
       updated_at = now()
     WHERE id = $10 AND doctor_account_id = $11
     RETURNING *`,
    [
      d.name || null, d.category || null, d.quantity ?? null, d.unit || null, d.reorderAt ?? null,
      "expiryDate" in d, d.expiryDate ?? null,
      "supplier" in d, d.supplier ?? null,
      req.params.id, req.teamAccess.doctorAccountId,
    ]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "Inventory item not found." });
  res.json({ item: result.rows[0] });
});

// Quick +/- stock adjustment (the frontend's applyAdjustment) — separate
// from the general PATCH above so a stock count change never accidentally
// piggybacks other field edits in the same request.
const adjustSchema = z.object({ doctorAccountId: z.string().uuid().optional(), delta: z.number().int() });

router.post("/:id/adjust", requireAuth, requireTeamAccess("access_inventory"), async (req, res) => {
  const parsed = adjustSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "delta must be an integer." });

  const result = await pool.query(
    `UPDATE inventory_items SET quantity = GREATEST(0, quantity + $1), updated_at = now()
     WHERE id = $2 AND doctor_account_id = $3
     RETURNING *`,
    [parsed.data.delta, req.params.id, req.teamAccess.doctorAccountId]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "Inventory item not found." });
  res.json({ item: result.rows[0] });
});

router.delete("/:id", requireAuth, requireTeamAccess("access_inventory"), async (req, res) => {
  const result = await pool.query(
    `DELETE FROM inventory_items WHERE id = $1 AND doctor_account_id = $2 RETURNING id`,
    [req.params.id, req.teamAccess.doctorAccountId]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "Inventory item not found." });
  res.json({ deleted: true });
});

module.exports = router;
