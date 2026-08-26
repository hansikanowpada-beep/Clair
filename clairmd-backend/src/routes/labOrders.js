const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");
const { requireAuth, requireAccountType } = require("../middleware/auth");

const router = express.Router();

// Structured, PLAINTEXT lab-order metadata (test name, category, status) —
// see schema.sql's comment above lab_orders for why this is deliberately
// not encrypted like patient_record_content: a lab order only does its job
// if a party without chart access can read what's actually being ordered.
// No tier/usage gate here, on purpose — ordering a test isn't part of the
// OPD/ICU-Ward note-creation quota system (routes/records.js), it's a
// separate, unlimited clinical action.

const DOCTOR_TYPES = ["individual_doctor", "hospital_doctor"];
const CATEGORIES = ["blood", "urine", "radiological", "microbiological", "immunological"];

async function assertOwnsRecord(patientRecordId, doctorId) {
  const result = await pool.query(
    `SELECT 1 FROM patient_record_index WHERE id = $1 AND primary_doctor_id = $2`,
    [patientRecordId, doctorId]
  );
  return result.rows.length > 0;
}

const createSchema = z.object({
  patientRecordId: z.string().uuid(),
  category: z.enum(CATEGORIES),
  testName: z.string().min(1),
});

router.post("/", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid lab order payload.", details: parsed.error.flatten() });

  const owns = await assertOwnsRecord(parsed.data.patientRecordId, req.account.id);
  if (!owns) return res.status(404).json({ error: "Record not found." });

  const result = await pool.query(
    `INSERT INTO lab_orders (patient_record_id, ordering_doctor_id, category, test_name)
     VALUES ($1, $2, $3, $4)
     RETURNING id, patient_record_id, category, test_name, status, result_note, ordered_at, completed_at`,
    [parsed.data.patientRecordId, req.account.id, parsed.data.category, parsed.data.testName]
  );
  res.status(201).json({ order: result.rows[0] });
});

// Lists this doctor's own orders — across all their patients, matching
// records.js's "GET /api/records" convention. Pass ?patientRecordId=...
// to scope to one record instead (still only this doctor's own).
router.get("/", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const queryParsed = z.string().uuid().optional().safeParse(req.query.patientRecordId);
  if (!queryParsed.success) return res.status(400).json({ error: "patientRecordId must be a valid UUID." });

  const params = [req.account.id];
  let filter = "";
  if (queryParsed.data) {
    params.push(queryParsed.data);
    filter = "AND patient_record_id = $2";
  }
  const result = await pool.query(
    `SELECT id, patient_record_id, category, test_name, status, result_note, ordered_at, completed_at
     FROM lab_orders WHERE ordering_doctor_id = $1 ${filter}
     ORDER BY ordered_at DESC`,
    params
  );
  res.json({ orders: result.rows });
});

// Status/result update — completed_at is set automatically the moment
// status flips to 'completed' (and cleared if it's ever moved back off
// completed), never trusted as a separate client-supplied field.
const updateSchema = z.object({
  status: z.enum(["pending", "completed", "cancelled"]).optional(),
  resultNote: z.string().optional(),
}).refine((data) => data.status !== undefined || data.resultNote !== undefined, {
  message: "Provide at least one of status or resultNote.",
});

router.patch("/:id", requireAuth, requireAccountType(...DOCTOR_TYPES), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid update payload.", details: parsed.error.flatten() });

  const { status, resultNote } = parsed.data;
  const result = await pool.query(
    `UPDATE lab_orders
     SET status = COALESCE($1, status),
         result_note = COALESCE($2, result_note),
         completed_at = CASE WHEN $1 = 'completed' THEN now() WHEN $1 IS NOT NULL THEN NULL ELSE completed_at END
     WHERE id = $3 AND ordering_doctor_id = $4
     RETURNING id, patient_record_id, category, test_name, status, result_note, ordered_at, completed_at`,
    [status || null, resultNote ?? null, req.params.id, req.account.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "Lab order not found." });
  res.json({ order: result.rows[0] });
});

module.exports = router;
