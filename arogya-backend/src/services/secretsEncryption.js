// Encrypts platform-side secrets (specifically: doctors' Google Drive OAuth
// refresh tokens) before they're written to the database. This is a
// DIFFERENT encryption layer from the patient-data encryption described in
// the technical spec — that happens client-side, in the doctor's browser/
// app, before patient data ever reaches this backend at all. This service
// only protects the OAuth tokens this server legitimately needs to hold to
// keep a doctor's Drive connection alive.

const crypto = require("crypto");
const config = require("../config");

const ALGORITHM = "aes-256-gcm";

function getKey() {
  const key = Buffer.from(config.secretsEncryptionKey, "base64");
  if (key.length !== 32) {
    throw new Error("SECRETS_ENCRYPTION_KEY must decode to exactly 32 bytes. Regenerate it — see .env.example.");
  }
  return key;
}

function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Store iv + authTag + ciphertext together, base64-encoded, so it's a
  // single opaque string in the database column.
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

function decrypt(blob) {
  const raw = Buffer.from(blob, "base64");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

module.exports = { encrypt, decrypt };
