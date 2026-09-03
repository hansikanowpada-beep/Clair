# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

ClairMD is an EHR (electronic health record) product for Indian clinics and hospitals. The repo is **two independent, separately-deployed projects** with no root-level tooling — always `cd` into one before running anything:

- **`clairmd-backend/`** — Node/Express REST API, deployed on Render. Handles accounts, billing, and cross-account coordination (referrals, care-team instructions, key-wrap routing) — never patient clinical content in readable form. Postgres (Neon in production).
- **`clair-frontend/`** — React/Vite SPA, deployed on Vercel (domain: clairmd.net). The actual clinical app doctors and patients use; almost the entire app lives in one very large file (`src/ClairMDEHR.jsx`, ~30k lines).

They communicate over plain HTTPS REST; the frontend has no server-side rendering or API routes of its own.

## The one rule that governs the whole backend

**The backend database must never contain patient clinical content in plaintext** — no `notes`, `diagnosis`, or free-text clinical column, ever. This is enforced by convention, not by a database constraint, so it's easy to violate by accident. Before adding any table or column, read the header comment in `clairmd-backend/src/db/schema.sql` (also restated in `server.js`'s and `README.md`'s opening comments).

What this means in practice:
- Real clinical notes (`patient_record_content`) and the emergency profile (`emergency_profiles`) are stored only as **opaque, client-side AES-GCM-encrypted blobs** the backend cannot decrypt. Encryption/decryption happens in the browser via Web Crypto (see `getOrCreateKeyPair` and surrounding helpers in `ClairMDEHR.jsx`). Multi-holder access (a co-admin doctor, a patient) works by wrapping the record's AES key with each holder's RSA-OAEP public key (`record_key_wraps`, `routes/coadmin.js`) — the backend routes wrapped keys around but never sees a private key or plaintext content.
- A doctor's Google Drive (their own OAuth-connected account, `drive.file` scope only) is the primary durable copy of a record; the backend's encrypted-blob store is an **additional** sync path, not a replacement. The backend never touches file bytes for Drive at all — it only mints short-lived access tokens (`GET /api/drive/access-token`) and the browser talks to the Drive API directly.
- A few tables are **deliberately plaintext** because the data isn't sensitive clinical narrative and a party without chart-decryption access genuinely needs to read it: `lab_orders` (test name/status/result), `care_team_instructions`, `patient_followups`, `feed_posts`. Don't use this as precedent for anything that *is* clinical narrative — the schema header explains the distinction each time it comes up.
- Anything AI-touches (transcription, OCR, LLM parsing) that might handle clinical text must not persist plaintext server-side, even transiently in a table/log — process in memory only and hand the result to the client for review + client-side encryption before it's ever written to Postgres.

## Backend (`clairmd-backend/`)

```bash
cd clairmd-backend
npm install
cp .env.example .env        # fill in real values; see comments in that file for what each does
npm run migrate              # applies db/migrations/*.sql in order, tracked in schema_migrations
npm run dev                  # node --watch src/server.js
npm start                    # production start, no watch
```

No test files currently exist (`npm test` runs `node --test src/**/*.test.js` against nothing) — don't go looking for a test suite.

Other one-off scripts (`npm run <name>`, all under `src/db/`): `erase-deactivated` (permanent account erasure, dry-run unless `--confirm`), `nightly-overage-billing`, `deliver-notifications` (push/email queue drain), `create-admin <email> <password>` (the *only* way to create an `admin` account — there's no public signup for it), `harvest-icd10`.

**Structure**: `src/server.js` is the entry point and mounts ~23 route modules under `/api/*` (`src/routes/`), each a thin Express router. Business logic that's more than a query or two lives in `src/services/` (billing/tier math, notifications, external terminology lookups, secrets encryption). No ORM — raw SQL via `pg` (`src/db/pool.js`). Auth is JWT bearer (`src/middleware/auth.js`: `requireAuth`, `requireAccountType(...types)`), 7-day expiry, no refresh tokens.

**Migrations**: `src/db/migrations/NNN_description.sql`, applied by the hand-rolled runner `src/db/migrate.js` (each in its own transaction, tracked in `schema_migrations`, only new ones run). `src/db/schema.sql` is a **reference snapshot** of the full schema for at-a-glance reading — it is not applied directly and must be kept in sync by hand whenever a migration is added.

**Account types** (`accounts.account_type` enum): `individual_doctor`, `hospital_doctor`, `hospital`, `patient`, `care_team_member`, `admin`. A doctor can be affiliated with a hospital (`hospital_affiliations`, doctor-initiated requests go through `hospital_affiliation_requests` and need the hospital's approval) and bill notes against either their own personal plan or a specific affiliated hospital's plan per-record (`billing_context_id` on the record, chosen via an optional `hospitalContextId` when creating it) — `primary_doctor_id` stays the actual doctor either way.

**Billing/tier model** (`src/services/tierAccess.js`): individual doctors are OPD-note-count-capped by plan tier and cannot create ICU/Ward notes at all. Hospitals are bed-count-scaled (quota = beds × 3 notes/bed/day × included days for their tier) and their ICU/Ward notes **never hard-block** past quota — patient care is never refused; overage is recorded (`overage_entries`) and billed the next night (`npm run nightly-overage-billing`) via Razorpay against a saved payment method, or flagged `no_payment_method`. Hospital OPD, unlike ICU/Ward, **does** hard-block past cap on lower tiers (no overage path built for it). Reading/editing an already-existing record is **never** gated by tier, billing, or overage state, on any plan — this invariant is relied on throughout the billing code and should not be broken by future changes.

**A convention worth knowing before you assume something is finished**: this codebase is written with an explicit "honest stub" discipline — genuinely unbuildable or unverifiable pieces (real medical license verification against NMC, the live Razorpay charge call, SMTP delivery) are left as clearly-labeled stubs with the reasoning documented inline, rather than a confident-looking implementation that was never actually run. Check `clairmd-backend/README.md`'s "What's honestly NOT built yet" section and any "**Live-tested**" vs. plain "checked" labels in a feature's own comments before assuming a route works end-to-end in production — a lot of this backend was written and statically verified (syntax, `require()` resolution, manual query review) in a sandbox with no database or outbound network access, and says so explicitly where that's the case.

## Frontend (`clair-frontend/`)

```bash
cd clair-frontend
npm install
npm run dev        # local dev server
npm run build       # production build → dist/
npm run preview     # serve that build locally
```

`VITE_API_BASE` (build-time env var, see `.env.example`) points the app at a backend; a `localStorage.clair_api_base` override can retarget an already-deployed build without a rebuild. Falls back to `http://localhost:4000/api` for local dev. No test suite here either.

**Structure**: `src/main.jsx` mounts `LandingPage.jsx` (role selection / login) which hands off into `src/ClairMDEHR.jsx` — the single-file clinic/patient app (OPD & ICU/Ward note builders, examination system, library, billing UI, admin dashboard, etc.). `src/api.js` holds the shared backend-call helpers (`apiRequest`, `getApiBase`, token storage) used by both entry points. `Ribbon.jsx` is the top toolbar. Given the file's size, prefer `Grep` over `Read` when working in `ClairMDEHR.jsx` — read only the section you need by line range once you've located it.

**Backend sync is local-first and best-effort everywhere**: a UI action (saving a note, ordering a lab test, updating bed availability, posting to the feed, etc.) updates local state immediately and unconditionally; a background call syncs it to the backend if a token is present, and a sync failure only ever surfaces as a small inline message — it never blocks or rolls back the local action that triggered it. Keep new features consistent with this pattern rather than making the UI depend on the backend being reachable.

**Diagnostic workflow libraries** (`src/data/surgicalWorkflows.js` — `WORKFLOWS`/`WORKFLOWS_BY_ID`, and `src/data/medicalWorkflows.js` — `MEDICAL_WORKFLOWS`/`MEDICAL_WORKFLOWS_BY_ID`): two independently-maintained, static reference-only clinical decision-tree datasets (condition → red flags → algorithm steps → citations), rendered by shared UI in `ClairMDEHR.jsx` (`DiagnosticWorkflowModal`, the Library "Medical Condition" view) and matched against free-text OPD notes via `findAnyWorkflowForText`. Display-only per the CDSCO Class A boundary this product operates under — named clinical scores/criteria are referenced by name only, never computed by the app. `medicalWorkflows.js` additionally has a hard rule: **no commercial textbook may be cited anywhere in it, in any form** — only free/open sources (NIH institutes, CDC, MedlinePlus, StatPearls as a CC-licensed link-and-credit fallback). Every entry's `id` in both files must stay globally unique against `DIAGNOSIS_META` (the combined alphabetical condition list, defined near the top of `ClairMDEHR.jsx`) and against each other — `medicalWorkflows.js` entries use a `med-` prefix specifically to guarantee this. `surgicalWorkflows.js` is treated as stable/complete and should not be edited when extending the medical library — add new clusters to `medicalWorkflows.js` instead, and check `surgicalWorkflows.js` first to avoid building a condition it already covers (e.g. acute abdomen, ectopic pregnancy, testicular torsion, acute limb ischaemia are all surgical-side already). Each new entry should pass the file's own `validateMedicalWorkflows()`/`validateWorkflows()` structural check (duplicate ids, dangling branch/next pointers, missing citation licence) before being considered done.

## External integrations

Real, wired credentials/APIs (see `clairmd-backend/.env.example` for the full list): Google OAuth (Drive), Razorpay (payments — order+checkout+webhook-verify path is real and live-tested; the actual recurring-charge call is still a stub), Firebase Cloud Messaging + SMTP (notifications, delivery genuinely proven for FCM, not yet for SMTP), WHO ICD-API (ICD-11/ICD-10 terminology, `services/whoIcd.js`), BHTS CSNOServ/LOINCServ (India's national SNOMED CT/LOINC terminology service, `services/bhtsTerminology.js`). Medical license verification (`services/licenseVerification.js`) is intentionally unconfigured — NMC has no officially documented public API, and this is flagged rather than guessed at.

## Licensing checks

GPL/license risk for this project comes from npm packages pulled into the
Node.js backend (`clairmd-backend/package.json`) and the React frontend
(`clair-frontend/package.json`) — not from GitHub or Neon themselves.
Before launch, do a one-time check of `dependencies`/`devDependencies`
license fields (e.g. `npm view <pkg> license`, or `npx license-checker
--summary` for the full transitive tree) to confirm nothing copyleft
(GPL/AGPL/LGPL) has crept in. Most mainstream packages (React, Express,
etc.) are MIT-licensed, so this is usually a quick check, but re-run it
whenever new dependencies are added.

Last checked: 2026-08-26 — clean in both projects:
- `clairmd-backend`: 218 MIT, 40 ISC, 34 Apache-2.0, 13 BSD-3-Clause, and
  a handful of other permissive licenses across all direct + transitive
  dependencies. One dual-licensed package (`node-forge`,
  `BSD-3-Clause OR GPL-2.0`) — usable under its BSD-3-Clause option, so
  not a copyleft obligation.
- `clair-frontend`: 89 MIT, 18 ISC, 3 BSD-3-Clause, and a few other
  permissive licenses. One MPL-2.0 package (`lightningcss`, a Tailwind
  v4/Vite build-time CSS tool) — build tooling only, not bundled into the
  shipped app, so MPL's file-level share-alike obligation doesn't reach
  ClairMD's own code.

No GPL/AGPL/LGPL-only packages in either project as of this check.
