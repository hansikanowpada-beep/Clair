-- ---------------------------------------------------------------------------
-- Patient record content — opaque encrypted blob, ONE per patient_record_
-- index row. Same trust model as emergency_profiles (011_emergency_access.
-- sql): this backend stores ciphertext only and never holds the key that
-- decrypts it, so it can route/back up a doctor's OPD/ICU-Ward note
-- (history, vitals, examination findings, diagnosis/plan, etc. — whatever
-- the client bundled into the note before encrypting it) without ever
-- seeing the clinical content itself.
--
-- This is deliberately an ADDITIONAL, optional sync path alongside the
-- existing drive_file_id pointer on patient_record_index (004_patient_
-- record_index.sql) — it does not replace Drive as the doctor's own
-- durable copy. A client is free to write here, to Drive, or to both;
-- this backend has no opinion and enforces none. What it exists for:
-- letting a record's content follow the SAME distribution this backend
-- already does for keys (record_key_wraps) — a co-admin or patient who
-- holds a valid, consented key wrap for a record can fetch this blob and
-- decrypt it client-side, without needing separate Drive access to the
-- primary doctor's own folder.
--
-- Never add a plaintext column here. If a query needs to filter or sort on
-- clinical content, that is a sign the content belongs client-side, not a
-- reason to decrypt it server-side.
CREATE TABLE patient_record_content (
    patient_record_id  UUID PRIMARY KEY REFERENCES patient_record_index(id) ON DELETE CASCADE,
    encrypted_blob      TEXT NOT NULL,           -- opaque ciphertext; see comment above
    blob_version        INTEGER NOT NULL DEFAULT 1,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
