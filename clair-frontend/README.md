# ClairMD EHR — Frontend Prototype

`src/ClairMDEHR.jsx` is the single-file React prototype for the clinic/patient
app, merged from three uploaded prototype exports (two were byte-identical;
the third was a strict superset adding the features below) and rebranded
from "Arogya" to "ClairMD" to match this product's name.

## Features merged in from the newer prototype

- **Rich OPD note editor** — a contentEditable free-text note area with a
  right-click formatting menu (bold/italic/underline/strikethrough, cut/copy/
  paste, undo, clear formatting) and an Insert → Templates flyout with
  boilerplate text blocks (normal exam, stable follow-up, discharge advice,
  referral, teleconsultation). Clicking an OPD tool icon now also drops a
  heading into the note.
- **OPD tool bar** switched from labelled pill buttons to a compact icon
  toolbar (one icon per tool: HPI, vitals, examination, differential
  diagnosis, workup, diagnosis/plan, triage, consent, MLC).
- **Sponsored ad cards** now support three types — `banner` (static image,
  default), `video` (muted looping inline clip), and `popup` (opens an
  in-app expanded overlay instead of leaving the app) — via `AdCard` and
  `AdPopupModal`.
- **Hospital sidebar** — "Build a hospital" and "Camp / medical aid mode"
  are now grouped under a collapsible "Admin" section alongside Statistics,
  Bed availability, Inventory manager, Planner, Follow-ups and Virtual OPD,
  with a scrollable nav and chevron (rather than +/-) expand/collapse
  indicators.
- Library modal and sidebar nav scrolling/overflow fixes.

## Examination quick-entry (Present/Absent)

All 11 examination systems (General, Cardiovascular, Respiratory, GI,
Musculoskeletal, Nervous, Urogenital, Endocrine, Skin, Eyes, ENT) now list
their common binary findings (e.g. Pallor, Jaundice, Cyanosis under General
inspection) with a Present/Absent button pair next to each — click once to
record it, click the same button again to clear it back to unset, instead of
typing every normal finding out by hand. Free text underneath still covers
anything not on the quick list. Both the OPD and ICU/Ward note builders fold
the picked findings into the generated note.

## Backend sync (prototype)

The OPD note builder and the ICU/Ward "Save and go back" flow now call the
real `clairmd-backend` API (`POST /api/records`, `PUT`/`GET
/api/record-content/:id`) after saving locally — see that repo's README for
the endpoints. A collapsible "Backend: not connected" panel in the OPD
builder logs in or signs up against the real `/api/auth` endpoints and
stores the JWT in `localStorage`; ICU/Ward saves reuse the same token and
report their sync result via a toast (bottom-right) since that flow
navigates away before an inline message could show.

This wiring is real (genuine `fetch` calls, genuine AES-GCM encrypt/decrypt
via the Web Crypto API, a genuine PUT-then-GET-then-decrypt round-trip
check against the backend) but scoped narrowly:

- **No key-wrap/consent scheme.** `clairmd-backend`'s real, multi-holder,
  consent-gated key distribution (`record_key_wraps`, `routes/coadmin.js`)
  isn't implemented client-side. Each record instead gets its own AES-GCM
  key generated in the browser and cached in `localStorage` — enough to
  prove the encrypt → sync → fetch → decrypt path genuinely works
  end-to-end, not a stand-in for the real co-admin/patient key sharing a
  production build needs.
- **No Drive upload.** Records are created with a placeholder
  `driveFileId`; the backend's encrypted-blob sync
  (`patient_record_content`) is the only place note content actually lands
  from this prototype.
- Local save always succeeds regardless of backend reachability — sync
  runs after, and a missing backend, expired token, or no connection never
  blocks or undoes the local save. Point `localStorage.clair_api_base` at
  a different URL to target a non-default backend (defaults to
  `http://localhost:4000/api`).

**Lab orders** work the same way: clicking "+ Order" next to a suggested
test (in the in-house-lab view of a patient's differential/workup tab)
records it locally immediately, then POSTs to the real
`POST /api/lab-orders` in the background — unlike note content, this goes
as **plaintext** (test name + category), matching `clairmd-backend`'s own
design (a lab order only works if a party without chart access can read
what's being ordered). Since ordering a test isn't tied to any "save"
moment the way a note is, the first order for a given patient in a session
lazily creates one shared `patient_record_index` row for that patient
(cached in `localStorage` under `clair_lab_record_<patientId>`) that
subsequent orders for the same patient reuse, rather than minting a new
backend record per test. The "· Ordered" badge turns red with "(sync
failed)" if the backend call didn't succeed — the local order itself is
never rolled back either way.

**Bed availability, inventory, patient follow-ups, and the specialty
feed** are wired the same local-first, best-effort way — local state
always updates immediately and never depends on the backend; a background
call syncs it when a token is present, and a failure only ever shows a
small inline "Backend sync skipped: …" message, never blocks or rolls
back the UI action that triggered it. `BackendSyncPanel` (the same
compact login/signup widget used for OPD notes) now also appears in
`BedAvailabilityPanel`, `InventoryManagerPanel`, `WritePostModal`,
`MyPostsPanel`, `FollowUpsPanel`, and `DoctorFeedPanel` — each with
whichever `accountType` that surface actually needs (`hospital` for
bed/inventory, `individual_doctor` for posts/follow-ups, `patient` for
feed reactions); the license-number field it used to always show on
signup now only appears for doctor account types.

- **Bed availability**: the two number inputs load the hospital's real
  saved status on open (if connected) and PUT to the backend on blur —
  no explicit Save button, matching how the panel already worked.
- **Inventory**: the 4 demo rows are replaced by the hospital's real
  saved items on open (if connected). Adding an item POSTs in the
  background and stamps the new row with its real `backendId` once that
  resolves; adjusting stock and removing an item only reach the backend
  for rows that already have one — an item added before ever connecting
  (or while the backend was unreachable) stays local-only for its own
  lifetime, same as before this wiring existed.
- **Patient follow-ups — doctor side only.** Sending a message or the
  "Send advice" button lazily creates the backend follow-up plan the
  first time (from the local plan's own fields), cached per plan, then
  reused for later messages. **Patient-side replies are NOT wired** —
  this is a real structural gap, not an oversight: `clairmd-backend`'s
  `POST /api/follow-ups` is doctor-account-only by design, and this
  prototype has no step anywhere that links a mock `PATIENTS` entry to a
  real backend patient account, so a patient-authenticated message POST
  would only ever get a 403. Flagged in code at `PatientFollowupReply`
  rather than wired to a call that's structurally guaranteed to fail.
- **Specialty feed**: publishing a plain update POSTs in the background
  and stamps the post with its real `backendId`. Pin/delete in
  `MyPostsPanel` and a patient's like/dislike in `DoctorFeedPanel` only
  reach the backend for posts that already carry one — the seeded demo
  feed content never does, so reacting to it stays exactly as local-only
  as it always was. The post-lifespan dropdown loads/saves the doctor's
  real `feed_post_expiry_months` setting when connected.
- **Feed post approval requests (case highlights)**: `WritePostModal`'s
  "about a specific patient" path POSTs the request to the backend
  (`requestPostPermissionOnBackend`) the same way a plain update does.
  `PatientInboxTab`'s "Post approvals" tab now also pulls in any pending
  requests that only exist on the backend (from an earlier session) via
  `GET /api/feed-post-requests/pending-for-me`, merged in by `backendId`
  so nothing shows twice; approving/declining a request that carries a
  `backendId` calls the matching backend endpoint, which for approve
  creates the real `feed_posts` row server-side (accepting the exact
  `formatCaseHighlight`-composed text the patient saw, so what's stored
  is never a second, possibly-drifted composition).
- `BackendSyncPanel` now also recognizes an already-valid token from an
  earlier instance on page load (calls `/api/auth/me`) — before this fix
  every new panel instance across these different surfaces would show
  "not connected" even with a good token already in `localStorage`,
  which would have undercut the whole point of storing it there.

## Real account signup/login (`HospitalAuthPanel`) and emergency profile

Two more surfaces switched from fully mocked to genuinely backed:

- **`HospitalAuthPanel`** ("Account access" in the hospital sidebar) — the
  multi-step wizard (payment, OTP) stays mocked (no real payment
  aggregator or SMS/email provider is wired, same honest-stub standard as
  `clairmd-backend`'s own license-verification and Razorpay-charge stubs),
  but "Verify & create account" now calls the real
  `POST /api/auth/signup`, and "Log in" calls the real
  `POST /api/auth/login`. Added password and medical-license-number
  fields the mocked flow never collected, since the real backend needs
  both. A real failure (wrong password, email already registered, license
  rejected) stops the wizard with the actual error rather than faking
  through to "Account created" regardless. On success, the app's
  `doctorDisplayName` (previously hard-coded to "Dr. Priya Nair") and, on
  login, `doctorSpecialty`/`doctorPlan` are hydrated from the real
  account — `plan_tier: 'elite'` maps to this app's `doctorPlan:
  'premium'` (the two systems use different tier vocabularies; that's the
  only mapping applied).
  - **The "hospital you're affiliated with" field stays display-only.**
    `POST /api/hospital-affiliations` is hospital-initiated (a hospital
    adds a doctor by account ID) — a doctor can't self-serve a link by
    typing a hospital's name during their own signup, so this field
    intentionally doesn't create one. Flagged inline in the code and in
    the UI's own helper text rather than silently pretending it works.
- **Emergency profile** (in the patient portal's Insurance tab) — the 5
  fields (blood group, medications, preferred hospital + phone, note)
  load the real saved profile on open and PUT to `/api/emergency-profile`
  on blur, same opaque-encrypted-blob trust model as note content
  (`patient_record_content`) — reuses the existing per-record AES-GCM
  helpers keyed by a fixed id, since there's exactly one emergency
  profile per real account rather than one per record. The "Unlock with
  fingerprint" button also reports the access
  (`POST /emergency-profile/access-log`) with the exact reason string
  selected — the four options already matched
  `clairmd-backend`'s `EMERGENCY_ACCESS_REASONS` enum verbatim, so no
  conversion was needed.

## Real doctor/care-team pickers, referrals, and care-team instructions

`CareTeamTab`'s "Cross-consultation referrals" and a new "Send an
instruction" section both used to target a hardcoded mock list
(`REFERRAL_DOCTOR_DIRECTORY`, now removed) or collect no recipient at all.
Both now use a shared `AccountPicker` component — a debounced search box
over the real `GET /api/account-directory` — so "refer to" / "instruct"
always resolves to one real, registered account, never a typed name.

- **Referrals**: sending one calls `POST /api/referrals` for real (lazily
  creating a backend record for the patient first, same
  `getOrCreatePatientRecordId` helper lab orders already use — renamed
  from `getOrCreateLabRecordId` now that three features share it). The
  "Referrals sent" list and a new "Referrals awaiting your response"
  inbox both read live from the backend (`GET /sent`, `GET /inbox`), so
  status is whatever the other doctor actually did — accept/decline calls
  `POST /:id/respond` for real. This replaces the old "Simulate: mark
  seen" button, which faked the exact thing this now does for real.
- **Care-team instructions**: a genuinely new section — sends
  `POST /api/care-team` to a real `care_team_member` account (instruction
  text + optional bed number), and lists what's been sent
  (`GET /sent`) with real acknowledged/pending status. The existing care
  team "roster" (4 fixed roles, free-text names) stays local-only and
  says so — `clairmd-backend` has no roster concept, only these one-off
  instructions.
- Receiving and acknowledging an instruction as the care-team member
  themselves isn't wired — this app has no care-team-member persona/view
  at all (doctor and patient are the only two), so there's nowhere to
  put that UI. The backend endpoint (`POST /:id/acknowledge`) exists and
  is ready for whenever that view does.

## Notifications, patient records/consent, billing, and data rights

Four more previously-unwired backend routes now have real UI:

- **`NotificationsBell`** — new, in the sidebar header next to the
  "ClairMD Clinic" logo (visible in every view, not tied to one patient).
  Polls `GET /api/notifications` every 30 seconds — matching
  `clairmd-backend`'s own design, which has no real push/email delivery
  wired server-side either, only a pollable queue — and marks read via
  `POST /:id/read`. Referral and care-team-instruction notifications show
  a generic label per `notification_type` rather than resolving the raw
  ids in the payload into names, since the endpoint doesn't provide those
  names and this is a read-only inbox, not worth a second lookup just to
  personalize the text.
- **`MyRecordsAndConsent`** — new, in the patient portal's summary tab.
  Shows which doctors hold a pointer to one of the patient's records
  (`GET /api/patient/records`) and any co-admin access requests awaiting
  a decision (`GET /api/patient/consent-requests`), with real
  grant/decline buttons (`POST /api/coadmin/consent`). That consent
  action needs no client-side crypto — it's a plain boolean gate on an
  already-submitted key wrap. The other half — a doctor assigning a
  co-admin and actually wrapping a key — was not built when this was
  first written; see "Co-admin key-wrap crypto" below for where that
  stood as of 2026-08-21.
- **`MyPlanAndBilling`** — new, in `DoctorProfilePanel`, added below (not
  merged into) the existing "In-app billing" toggle, since that's the
  clinic's own patient-billing feature — a different concept from a
  doctor's own subscription to ClairMD, which is what this shows for
  real (`GET /api/billing/plan`, `GET /api/billing/history`).
- **`DataRightsPanel`** — new, also in `DoctorProfilePanel`. "Export my
  data" downloads the real `GET /api/data-rights/export` response as JSON
  (reusing the existing `downloadText` helper); "Deactivate account"
  requires the real password and calls the real
  `POST /api/data-rights/deactivate`, then disconnects the local session.
  Matches the backend's own scope note verbatim: this covers platform
  metadata only, never the clinical records held in a doctor's own
  Google Drive.

## Founder/admin dashboard

New top-level app mode, alongside "clinic" and "patient" — `appMode ===
"admin"`, entered via a small, deliberately unobtrusive "Founder admin →"
text link tucked under the sidebar logo (not a normal nav item, and not
the same thing as the sidebar's existing "Admin" group — that one is
hospital/clinic administration tools for a doctor account; this is a
whole separate founder/platform-operator persona that no doctor or
patient account can reach).

- **`AdminDashboardView`** — login-only, no signup tab, matching
  `clairmd-backend` exactly: `admin` accounts have no public signup route
  at all (see that repo's `routes/auth.js` and
  `db/createAdminAccount.js`), so there is nothing to sign up for here.
  After a real login, it checks the returned `account_type`; a correct
  password on a non-admin account still gets rejected with an explicit
  "this isn't a founder-admin account" message rather than silently
  showing an empty or broken dashboard.
- Once connected as a genuine admin account, it fetches and renders all
  four of `clairmd-backend`'s `GET /api/admin/*` routes: `/overview`
  (accounts by type, doctor/hospital plan tiers, signups this month vs
  last, this month's revenue), `/hospitals-at-risk` (hospitals currently
  restricted for unresolved overage billing, plus pending overage
  counts), `/backup-health` (Drive backup failure rate over the last 7
  days), and `/notification-health` (delivered vs undelivered
  notifications over 7 days — expect 0 delivered until real FCM/SMTP
  credentials exist, which the card says explicitly rather than looking
  like a bug). A manual "Refresh" re-fetches all four; a failed fetch
  shows an explicit error banner instead of failing silently, since the
  entire point of this view is to surface platform problems — swallowing
  an error here would defeat it.
- No backend code changed for this — `routes/admin.js`'s four routes were
  already fully built; this is purely the first real frontend caller for
  them.
- Shares the same single browser-wide `clair_auth_token` as every other
  backend-sync surface in this prototype (see the module comment above
  `getApiBase()` in `ClairMDEHR.jsx`), so logging in here replaces
  whatever doctor/patient session token was active before — a known
  limitation of this prototype's no-session-context design, not new to
  this feature.

## Co-admin key-wrap crypto (real end-to-end)

The one previously-genuine gap in this whole prototype — every other
"backend sync" feature in this file has an honest simplification
somewhere, but co-admin assignment had *no* crypto at all, not even a
placeholder. As of 2026-08-21 it's real RSA-OAEP + AES-GCM key wrapping,
matching `clairmd-backend`'s `record_key_wraps` design exactly, not a
shortcut around it.

- **`getOrCreateKeyPair()`** — new, alongside the existing per-record
  AES-GCM helpers. Generates a 2048-bit RSA-OAEP keypair the first time an
  account needs one, keeps the private key in `localStorage`
  (`clair_private_key`) and nowhere else, and publishes only the public
  key to `PUT /api/auth/public-key`. If the backend already has a public
  key on file for this account and this browser has no matching private
  key, it refuses to generate a second keypair rather than silently
  overwriting the published one — that would orphan every wrap already
  made for the original key, permanently. There is no recovery flow for
  that case in this prototype; it's a real limitation, not hidden.
- **`wrapRecordKeyForRecipient(recordId, recipientPublicKeyB64)`** — wraps
  a record's existing AES-GCM key (the same one `getOrCreateRecordKey`
  already manages) with a recipient's RSA-OAEP public key. Only ever
  called for a record this browser genuinely holds the real key for (see
  `hasLocalRecordKey` below) — never fabricates a key for a record it
  doesn't actually have.
- **`hasLocalRecordKey(recordId)`** — a plain cache check, deliberately
  NOT reusing `getOrCreateRecordKey` (which generates a fresh key on a
  cache miss — correct when creating a new note, wrong here, since a
  freshly-generated key for a record whose real key lives on a different
  device would produce a wrap that looks valid but decrypts nothing).
- **`fetchAndCacheWrappedRecordKey(recordId)`** / **`loadCoAdminRecordContent(recordId)`**
  — the recipient side: fetches the wrapped key from
  `GET /api/coadmin/key-wraps/:id` (subject to the backend's own consent
  gate), unwraps it with this account's private key, and caches the
  result in the exact same `localStorage` slot `getOrCreateRecordKey`
  reads from — so the existing `decryptRecordText` works completely
  unmodified for a co-admin, the same way it already does for the primary
  doctor. No parallel decrypt path was needed.
- **`assignCoAdminOnBackend(coAdminDoctorId, coAdminPublicKeyB64)`** — the
  actual assignment flow: registers the assignment
  (`POST /api/coadmin/assign`), lists the doctor's own records
  (`GET /api/records`), and wraps + submits a key for every one this
  browser has a real key for. Records this browser never opened are
  skipped with an explicit reason in the per-record result, not silently
  dropped or faked.
- **`CoAdminPanel`** — new, in `DoctorProfilePanel` below `DataRightsPanel`.
  Two halves on one page: "Your co-admin" (an `AccountPicker` search +
  assign button, showing exactly how many of your records got wrapped and
  why any were skipped) and "Records shared with you as a co-admin" (every
  wrap `GET /api/coadmin/my-wraps` returns, with a "View" button that only
  appears once `consent_granted` is true — before that it shows "Awaiting
  patient consent", matching the backend's access gate precisely rather
  than showing a button that would just 403). A manual "Refresh" link
  re-fetches both halves.
- **Both of the deliberately-out-of-scope limitations from launch — key
  backup/recovery and revocation — are now built.** See "Co-admin
  polish" below (2026-08-22) for both.

### Live-tested end to end (2026-08-21) — one real bug found and fixed

Everything above was verified against a genuinely running stack, not just
read for correctness: real Postgres 16, real `clairmd-backend` (all 24
migrations applied fresh, including `024_account_public_keys.sql`), and
for the crypto/API layer, a Node script driving real HTTP calls with the
exact same WebCrypto operations this file uses — two doctor accounts, a
patient account, a real record, a real RSA-OAEP wrap, and a real decrypt
that produced back the exact original plaintext. Negative paths were
checked too: an uninvolved third doctor gets 404 on both the content and
the wrap, and a patient revoking consent immediately locks the co-admin
out again (403).

The crypto/API layer alone doesn't exercise `CoAdminPanel`'s actual React
code, so it was also driven through a real browser (a throwaway Vite
scaffold pointed at this exact file, not a copy of it, since this repo
has no bundler of its own to launch) with two isolated browser contexts —
one per doctor, each with its own `localStorage`/token, exactly like two
different people on two different machines. Signed up through the real
signup form, searched for the real co-admin through the real
`AccountPicker`, clicked the real "Assign" button, and watched the
second browser's "Awaiting patient consent" → "View" → decrypted note
text transition happen for real after a patient API call granted
consent.

That browser run caught a genuine bug this file's own text had missed:
**`CoAdminPanel`'s public-key publish only ran once, at mount** — so
signing up through the panel's *own* embedded `BackendSyncPanel` (which
necessarily happens *after* the panel has already mounted) never
triggered it. A doctor could open the panel, sign up right there, and
still never get a public key published — nobody could ever assign them
as a co-admin. Fixed by giving `BackendSyncPanel` an optional
`onConnected(account)` callback, fired both when an already-valid token
is found at mount AND right after a fresh login/signup — `CoAdminPanel`
now wires its key-publish + refresh into that callback instead of a
mount-only effect. Backward compatible: every other `BackendSyncPanel`
usage in this file (there are around ten) doesn't pass the new prop, so
none of them changed behavior.

## Co-admin polish: revocation and key backup/recovery (2026-08-22)

The two limitations explicitly flagged as deliberately out of scope when
co-admin crypto first shipped. Both are real, working features now, not
stand-ins.

- **`revokeCoAdminAccess()`** — rotates the AES key for every record this
  browser holds a real key for (decrypt with the old key, generate a
  genuinely fresh one, re-encrypt, re-sync) *before* calling
  `POST /api/coadmin/revoke`, which deletes the former co-admin's wrap
  rows server-side. The result: a fresh fetch attempt gets a plain 404
  (no wrap exists), and even a still-cached OLD key from before
  revocation no longer decrypts the CURRENT content. What this
  deliberately does NOT do — and no key-wrap system can — is erase a
  copy the former co-admin already fetched and decrypted before
  revocation happened. Wired into `CoAdminPanel` as a "Revoke access"
  link next to the current assignment, reporting exactly how many
  records were rotated and how many were skipped (no local key in this
  browser for those).
- **`exportPrivateKeyBackup(password)`** / **`importPrivateKeyBackup(json,
  password)`** — a real, fully local, fully testable (no network
  involved at all) password-protected export/import of the raw RSA
  private key. PBKDF2-SHA256 at 210,000 iterations (OWASP's current
  baseline) derives an AES-GCM key from the chosen password, which wraps
  the private key bytes into a downloadable JSON file. The file is
  meaningless without the password; ClairMD's backend never sees either
  one — this never leaves the browser in either direction. Wired into
  `CoAdminPanel`'s new "Key backup & recovery" section: a password field
  + "Download" button on one side, a file picker + password field +
  "Restore" button on the other.
- **Live-tested, thoroughly, since this is genuinely testable without any
  external dependency**: a real RSA keypair backed up and restored comes
  back byte-for-byte identical; a wrong password is rejected with a clear
  error rather than silently returning garbage; a corrupted backup file
  is rejected; and — the strongest check — the RESTORED key was used to
  genuinely unwrap a fresh AES key and decrypt real content, proving the
  restored key isn't just byte-identical but functionally usable. The
  revocation flow was live-tested end to end against a real running
  backend: assign → wrap → consent → fetch (succeeds) → revoke → fetch
  again (now 404s) → confirm `my-wraps`/`my-assignment` reflect the
  revocation → confirm re-revoking with nothing active fails cleanly
  rather than crashing.

## Google Drive encrypt-upload / download-decrypt (real, end to end)

The other genuinely-missing piece from earlier in this file's own module
comment: "no Google Drive upload happens from this prototype." As of
2026-08-21 it does, using `clairmd-backend`'s real OAuth connection and
the real Drive REST API called directly from the browser — the actual
"encrypt before it leaves the device, decrypt after it comes back" flow
the product was always meant to have, not a stand-in for it.

- **`getDriveAccessToken()`** — fetches a short-lived Drive access token
  from `GET /api/drive/access-token`, cached in memory only (never
  `localStorage` — unlike the auth JWT, there's no reason for a ~1h Drive
  token to survive a reload; re-minting it is cheap and it's more
  sensitive than most things this file already caches).
- **`startDriveConnection()`** — opens the real Google OAuth consent
  screen in a popup (`GET /api/drive/oauth/start`'s `authUrl`) and polls
  `GET /api/drive/backup-status` every 2s until `connected: true`,
  instead of relying on a postMessage handshake with the callback page.
  Times out after 2 minutes; throws a clear error if the doctor closes
  the popup before finishing.
- **`uploadEncryptedBlobToDrive(recordId, encryptedBlob)`** — creates (or,
  on every later save, updates in place) a file in the doctor's dedicated
  Drive app folder via the real `multipart/related` Drive v3 upload
  endpoint. The metadata part is just a non-descriptive filename; the
  content part is the exact same opaque base64 ciphertext already sent to
  `/api/record-content` — Drive never sees anything this backend doesn't
  already treat as opaque too. The real Drive file id is cached in
  `localStorage` (`clair_drive_file_<recordId>`) so the second save
  updates the same file instead of creating a duplicate.
- **`downloadEncryptedBlobFromDrive(recordId)`** / **`resolveDriveFileId`**
  — the read side: resolves the real file id (this browser's own cache,
  or falling back to the backend's `patient_record_index.drive_file_id`
  pointer for a fresh browser profile) and downloads it via Drive's
  `alt=media` endpoint.
- **`syncNoteToBackend`** (existing, from the original merge) now does the
  full Drive round trip too, automatically, on every OPD/ICU-Ward save —
  after its existing backend verification succeeds, it uploads to Drive
  (if connected), downloads what it just uploaded, decrypts it, and
  compares against the original text, exactly mirroring the backend
  verification already in place. This is best-effort by design: a Drive
  failure (not connected, popup never finished, an expired token) never
  throws — the already-verified backend sync stands on its own — it's
  returned as `{ driveSynced, driveError }` alongside the existing
  `recordId`, and both OPD/ICU-Ward save flows now show it in their
  sync-status message when relevant.
- **`DriveConnectionPanel`** — new, in `DoctorProfilePanel` between
  `MyPlanAndBilling` and `DataRightsPanel`. A real "Connect Google Drive"
  button (drives `startDriveConnection`), and once connected, the real
  account email, last backup status/time from `GET /backup-status`, and a
  quota warning banner when `quotaWarning` comes back true.
- **What this does NOT change**: the backend's own `patient_record_content`
  sync (this file's very first "Backend sync" section) keeps working
  completely independently of Drive — a doctor who never connects Drive
  at all still gets a fully working, verified encrypt/sync/decrypt round
  trip against `clairmd-backend` alone, exactly as before this feature
  existed.
- **Live-tested**: the backend's new/changed routes were verified against
  a real running Postgres + Express stack — `backup-status` correctly
  reports not-connected, `access-token` correctly 404s before connecting,
  `oauth/start` returns a genuine `accounts.google.com` URL. **Not**
  live-tested: the actual consent screen, or a real upload/download round
  trip — both need a real Google Cloud OAuth client (Client ID/Secret),
  which doesn't exist in this sandbox. To get one for testing (no real
  end-users needed — Google's OAuth "Testing" publish status supports up
  to 100 explicitly-added test-user Google accounts with no app-review
  process): create a Google Cloud project, enable the Google Drive API,
  configure the OAuth consent screen as **External** / **Testing** with
  the `drive.file` scope and your own Google account added as a test
  user, then create a **Web application** OAuth client with authorized
  redirect URI `http://localhost:4000/api/drive/oauth/callback` (must
  match `GOOGLE_REDIRECT_URI` in `clairmd-backend/.env` exactly). Once
  real `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` values are in `.env`,
  this whole flow is ready to live-test the same way co-admin was.

## Hospital billing & payment (real Razorpay Checkout)

New `HospitalBillingPanel`, in the sidebar's Admin group between
"Inventory manager" and "Planner" — reachable only as a hospital account
(same convention as Bed availability/Inventory manager, which already use
`accountType="hospital"`). Was a genuine gap: `clairmd-backend`'s
`payment_methods` table and nightly overage-billing job existed, but
nothing anywhere in this frontend could actually put a payment method on
file.

- **`loadRazorpayCheckoutScript()`** — injects Razorpay's real
  `checkout.js` on demand, once, the first time it's needed.
- **`addHospitalPaymentMethod(email, displayName)`** — the real flow:
  creates a genuine order (`POST /api/hospital-billing/setup-order`),
  opens Razorpay's actual Checkout widget with `recurring: 1` (requests
  tokenization for future unattended charges), and on success hands the
  result to `POST /api/hospital-billing/setup-order/verify` — which
  independently re-derives the signature server-side rather than trusting
  the browser's success callback. Only resolves once the backend has
  actually saved a verified payment method.
- **`loadHospitalPaymentMethodStatus()`** / **`loadHospitalOverageStatus()`**
  — power the panel's two sections: whether a payment method is on file,
  and the real breakdown of overage entries by charge status (pending/
  charged/failed/no_payment_method), plus a restriction banner when
  `adminRestricted` comes back true.
- **Not independently verified**: the exact Razorpay response fields this
  reads for the recurring-charge token — see the matching, more detailed
  note in `clairmd-backend/README.md`. The Checkout.js integration
  pattern itself (order → widget → signature verify) is the well-
  established, high-confidence part.
- The nominal ₹1 linking charge shown in the UI is explicitly labeled a
  placeholder pending a real product decision, not presented as final
  pricing.

## Care team member portal

New `CareTeamPortalView`, a whole missing persona until now — a fourth
top-level app mode (`appMode === "careTeam"`, alongside "clinic",
"patient", "admin"), entered via a small "Care team login →" link under
the sidebar logo, next to "Founder admin →". Backend support
(`routes/careTeam.js`'s `GET /pending`/`POST /:id/acknowledge`) and even
the frontend helper functions (`loadPendingCareTeamInstructions`,
`acknowledgeCareTeamInstructionOnBackend`) already existed — nothing ever
called them, since only the doctor-sending side (`CareTeamTab`) had a
view.

- Login/signup via the existing `BackendSyncPanel` with
  `accountType="care_team_member"` — this account type has real public
  signup (`routes/auth.js`'s schema already includes it).
- Shows every pending instruction with its real patient display name, bed
  number, diagnosis summary, instruction text, and sending doctor's
  name/specialty — never chart or key access, matching the backend's own
  scoped-queue design.
- "Acknowledge" clears it from the list immediately (the backend call
  already succeeded by then) and, server-side, notifies the sending
  doctor and sets `acknowledged_at` on their own `/sent` view.
- **Live-tested end to end**: a real doctor sent a real instruction to a
  real care-team-member account; the recipient's queue showed every field
  correctly; acknowledging it cleared it and updated the doctor's sent
  view; a doctor account was confirmed unable to call either
  care-team-only route.

## Hospital affiliations (doctor request + hospital approve/decline)

Was a bigger gap than it first looked: nothing in the frontend was wired
to `hospital_affiliations` at all before this — not even a read-only
"your affiliated doctors" list for a hospital, or "which hospitals am I
affiliated with" for a doctor. `HospitalAuthPanel`'s signup-time
"Hospital you're affiliated with" field was always display-only (see its
updated help text, pointing here).

- **`HospitalAffiliationPanel`** — new, in `DoctorProfilePanel` between
  `DriveConnectionPanel` and `DataRightsPanel`. Shows current real
  affiliations, an `AccountPicker` (types: `["hospital"]`) to find a real
  hospital and send a request, and a status list of sent requests
  (pending/approved/declined).
- **`HospitalAffiliatedDoctorsPanel`** — new, in the sidebar's Admin group
  ("Affiliated doctors", hospital accounts only) between "Billing &
  payment" and "Planner". Shows pending requests with Approve/Decline
  buttons and the real list of currently-affiliated doctors.
- **Live-tested end to end**: a real doctor requested affiliation with a
  real hospital, the hospital's panel showed it with the real doctor
  name, a different doctor was confirmed unable to act on someone else's
  request, approving created a real affiliation the doctor's own panel
  then showed, and a decline-then-re-request correctly reused the same
  request rather than erroring.

## License verification banner removed (2026-08-22)

`VerificationBanner` — the "License verification pending... Check status
(demo)" banner with its fake "Check status" button — is gone, along with
the `doctorVerified` state that drove it. It was always purely cosmetic
(grepped for every other reference to `doctorVerified` before removing
it — there were none; nothing actually gated on it), and now that
`clairmd-backend`'s signup route no longer performs or claims to perform
real license verification either (see that repo's README), showing a
fake "verification pending" step made even less sense than before —
product decision was to remove it entirely rather than leave a UI
element pointing at a check the backend doesn't do. Revisit both sides
together whenever real verification actually gets built.

## Renaming

All in-app branding was updated from "Arogya" to "ClairMD" (not plain
"Clair" — the product name is ClairMD, domains `clairmd.net` /
`clairmd.in`):

- "Arogya Clinic" → "ClairMD Clinic" (patient home screen, discharge slip
  footer, hospital directory, hospital-affiliation form placeholders)
- `arogyaclinic.app` feedback links → `clairmd.net`
- The exported component `ArogyaEHR` → `ClairMDEHR` (file renamed
  `ClairEHR.jsx` → `ClairMDEHR.jsx` to match)
