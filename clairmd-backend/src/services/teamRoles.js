// Practice team role definitions — shared between routes/teamMembers.js
// (assigning members, setting default access) and routes/recordContent.js
// (enforcing that only a Duty Doctor can write clinical content, not just
// see it). Kept here rather than inline in either route so both import the
// same source of truth instead of two copies drifting apart.

// access_clinical_record covers Files + Bed + History as one gate — see
// 028_team_memberships.sql's comment: patient_record_content is a single
// encrypted blob per record, so these can't be granted as separately-
// encrypted domains without a deeper schema change.
const ROLE_DEFAULT_ACCESS = {
  admin: { access_clinical_record: true, access_inventory: true, access_lab_reports: true },
  duty_doctor: { access_clinical_record: true, access_inventory: false, access_lab_reports: true },
  nurse: { access_clinical_record: false, access_inventory: false, access_lab_reports: false },
  lab_technician: { access_clinical_record: false, access_inventory: false, access_lab_reports: false },
  pharmacist: { access_clinical_record: false, access_inventory: false, access_lab_reports: false },
  specialist: { access_clinical_record: false, access_inventory: false, access_lab_reports: false },
};

const TEAM_ROLES = Object.keys(ROLE_DEFAULT_ACCESS);

// Mirrors the mobile demo's roleHasClinicalPermission: only a Duty Doctor
// examines a patient or adds clinical instructions. Data access (the
// access_* flags) decides whether a role can SEE the record at all; this
// decides whether, given access_clinical_record, they can also WRITE to it.
function roleHasClinicalWriteAccess(role) {
  return role === "duty_doctor";
}

module.exports = { ROLE_DEFAULT_ACCESS, TEAM_ROLES, roleHasClinicalWriteAccess };
