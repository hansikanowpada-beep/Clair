const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");
const { requireAuth, requireAccountType } = require("../middleware/auth");
const { ROLE_DEFAULT_ACCESS, TEAM_ROLES } = require("../services/teamRoles");

const router = express.Router();

// Practice team roster — a doctor's own nurses, duty doctors, lab
// technicians, pharmacists, and specialists, each granted access to a
// specific slice of the doctor's data. Same "route wrapped keys, never see
// plaintext" boundary as coadmin.js for the two encrypted domains (Files,
// History); the other three domains (Bed, Inventory, Lab Reports) are
// plaintext tables, so granting them is a plain authorization flag with no
// crypto involved — see 028_team_memberships.sql's column comments.

const assignSchema = z.object({
  memberAccountId: z.string().uuid(),
  role: z.enum(TEAM_ROLES),
});

router.post("/assign", requireAuth, requireAccountType("individual_doctor", "hospital_doctor"), async (req, res) => {
  const parsed = assignSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "memberAccountId and a valid role are required." });
  if (parsed.data.memberAccountId === req.account.id) {
    return res.status(400).json({ error: "You can't add yourself to your own team." });
  }

  const access = ROLE_DEFAULT_ACCESS[parsed.data.role];
  const result = await pool.query(
    `INSERT INTO team_memberships
       (doctor_account_id, member_account_id, role, access_files, access_history, access_bed, access_inventory, access_lab_reports)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (doctor_account_id, member_account_id) DO UPDATE
       SET role = EXCLUDED.role, revoked_at = NULL, invited_at = now()
     RETURNING id`,
    [req.account.id, parsed.data.memberAccountId, parsed.data.role, access.access_files, access.access_history, access.access_bed, access.access_inventory, access.access_lab_reports]
  );

  res.status(201).json({ id: result.rows[0].id, defaultAccess: access });
});

const updateSchema = z.object({
  role: z.enum(TEAM_ROLES).optional(),
  access: z.object({
    access_files: z.boolean().optional(),
    access_history: z.boolean().optional(),
    access_bed: z.boolean().optional(),
    access_inventory: z.boolean().optional(),
    access_lab_reports: z.boolean().optional(),
  }).optional(),
});

router.patch("/:id", requireAuth, requireAccountType("individual_doctor", "hospital_doctor"), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid update payload." });

  const membership = await pool.query(
    `SELECT id FROM team_memberships WHERE id = $1 AND doctor_account_id = $2 AND revoked_at IS NULL`,
    [req.params.id, req.account.id]
  );
  if (membership.rows.length === 0) return res.status(404).json({ error: "No active team membership found." });

  const sets = [];
  const values = [];
  let i = 1;
  if (parsed.data.role) { sets.push(`role = $${i++}`); values.push(parsed.data.role); }
  if (parsed.data.access) {
    for (const [col, val] of Object.entries(parsed.data.access)) {
      sets.push(`${col} = $${i++}`);
      values.push(val);
    }
  }
  if (sets.length === 0) return res.status(400).json({ error: "Nothing to update." });

  values.push(req.params.id);
  await pool.query(`UPDATE team_memberships SET ${sets.join(", ")} WHERE id = $${i}`, values);
  res.json({ updated: true });
});

// Revokes a team membership, deletes their 'team_member' key wraps for this
// doctor's records so a re-fetch 404s, same shape as coadmin's revoke. Does
// NOT retroactively un-decrypt anything already cached on the member's own
// device — same inherent E2EE limitation noted there. The frontend's
// equivalent of revokeCoAdminAccess (rotating each affected record's real
// AES key) is what actually stops them reading anything NEW after this.
router.post("/:id/revoke", requireAuth, requireAccountType("individual_doctor", "hospital_doctor"), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const membership = await client.query(
      `UPDATE team_memberships SET revoked_at = now()
       WHERE id = $1 AND doctor_account_id = $2 AND revoked_at IS NULL
       RETURNING member_account_id`,
      [req.params.id, req.account.id]
    );
    if (membership.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "No active team membership to revoke." });
    }
    const memberAccountId = membership.rows[0].member_account_id;
    const deleted = await client.query(
      `DELETE FROM record_key_wraps
       WHERE holder_account_id = $1 AND holder_role = 'team_member'
         AND patient_record_id IN (SELECT id FROM patient_record_index WHERE primary_doctor_id = $2)
       RETURNING patient_record_id`,
      [memberAccountId, req.account.id]
    );
    await client.query("COMMIT");
    res.json({ revoked: true, affectedRecordIds: deleted.rows.map((r) => r.patient_record_id) });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

router.get("/my-team", requireAuth, requireAccountType("individual_doctor", "hospital_doctor"), async (req, res) => {
  const result = await pool.query(
    `SELECT m.id, m.member_account_id, acc.display_name AS member_name, acc.account_type AS member_account_type,
            m.role, m.access_files, m.access_history, m.access_bed, m.access_inventory, m.access_lab_reports, m.invited_at
     FROM team_memberships m JOIN accounts acc ON acc.id = m.member_account_id
     WHERE m.doctor_account_id = $1 AND m.revoked_at IS NULL
     ORDER BY m.invited_at ASC`,
    [req.account.id]
  );
  res.json({ team: result.rows });
});

// The teams I'm a member of — mirrors coadmin's /my-wraps: "which doctors
// have added me, and what can I see."
router.get("/my-memberships", requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT m.id, m.doctor_account_id, acc.display_name AS doctor_name, m.role,
            m.access_files, m.access_history, m.access_bed, m.access_inventory, m.access_lab_reports
     FROM team_memberships m JOIN accounts acc ON acc.id = m.doctor_account_id
     WHERE m.member_account_id = $1 AND m.revoked_at IS NULL
     ORDER BY m.invited_at DESC`,
    [req.account.id]
  );
  res.json({ memberships: result.rows });
});

// Called once per (record, team member) when Files/History access is
// granted: the client wraps that record's existing AES key for the
// member's public key and submits the wrapped blob here — same one-time
// event shape as coadmin's POST /key-wraps.
const submitKeyWrapSchema = z.object({
  patientRecordId: z.string().uuid(),
  memberAccountId: z.string().uuid(),
  wrappedKey: z.string().min(1),
});

router.post("/key-wraps", requireAuth, requireAccountType("individual_doctor", "hospital_doctor"), async (req, res) => {
  const parsed = submitKeyWrapSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid key wrap payload." });

  const membership = await pool.query(
    `SELECT access_files, access_history FROM team_memberships
     WHERE doctor_account_id = $1 AND member_account_id = $2 AND revoked_at IS NULL`,
    [req.account.id, parsed.data.memberAccountId]
  );
  if (membership.rows.length === 0) {
    return res.status(400).json({ error: "No active team membership for this account." });
  }
  if (!membership.rows[0].access_files && !membership.rows[0].access_history) {
    return res.status(400).json({ error: "This team member hasn't been granted Files or History access." });
  }

  await pool.query(
    `INSERT INTO record_key_wraps (patient_record_id, holder_account_id, holder_role, wrapped_key)
     VALUES ($1, $2, 'team_member', $3)
     ON CONFLICT (patient_record_id, holder_account_id) DO UPDATE SET wrapped_key = EXCLUDED.wrapped_key`,
    [parsed.data.patientRecordId, parsed.data.memberAccountId, parsed.data.wrappedKey]
  );

  res.status(201).json({ stored: true });
});

// Fetch the wrapped key this account is entitled to for a given record.
// Unlike coadmin's consent gate (which is per-patient and patient-granted),
// a team member's gate is the doctor's own access_files/access_history
// flag — no separate patient consent step, per care_team_instructions'
// existing precedent for staff acting under the doctor's direction.
router.get("/key-wraps/:patientRecordId", requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT k.wrapped_key, m.access_files, m.access_history
     FROM record_key_wraps k
     JOIN patient_record_index r ON r.id = k.patient_record_id
     JOIN team_memberships m ON m.doctor_account_id = r.primary_doctor_id AND m.member_account_id = k.holder_account_id
     WHERE k.patient_record_id = $1 AND k.holder_account_id = $2 AND k.holder_role = 'team_member' AND m.revoked_at IS NULL`,
    [req.params.patientRecordId, req.account.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "No key available for this account and record." });

  const row = result.rows[0];
  if (!row.access_files && !row.access_history) {
    return res.status(403).json({ error: "Team access to this record's content has been revoked." });
  }
  res.json({ wrappedKey: row.wrapped_key });
});

module.exports = router;
module.exports.roleHasClinicalWriteAccess = roleHasClinicalWriteAccess;
module.exports.TEAM_ROLES = TEAM_ROLES;
