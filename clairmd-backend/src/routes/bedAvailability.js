const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");
const { requireAuth, requireAccountType } = require("../middleware/auth");

const router = express.Router();

// Self-managed, hospital-only. Pure operational status, no clinical
// content — see schema.sql's comment on hospital_bed_status.

const putSchema = z.object({
  totalBeds: z.number().int().min(0),
  availableBeds: z.number().int().min(0),
});

router.put("/", requireAuth, requireAccountType("hospital"), async (req, res) => {
  const parsed = putSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid bed status payload.", details: parsed.error.flatten() });

  const result = await pool.query(
    `INSERT INTO hospital_bed_status (hospital_account_id, total_beds, available_beds, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (hospital_account_id) DO UPDATE
       SET total_beds = $2, available_beds = $3, updated_at = now()
     RETURNING hospital_account_id, total_beds, available_beds, updated_at`,
    [req.account.id, parsed.data.totalBeds, parsed.data.availableBeds]
  );
  res.json({ bedStatus: result.rows[0] });
});

router.get("/", requireAuth, requireAccountType("hospital"), async (req, res) => {
  const result = await pool.query(
    `SELECT hospital_account_id, total_beds, available_beds, updated_at FROM hospital_bed_status WHERE hospital_account_id = $1`,
    [req.account.id]
  );
  res.json({ bedStatus: result.rows[0] || { hospital_account_id: req.account.id, total_beds: 0, available_beds: 0, updated_at: null } });
});

module.exports = router;
