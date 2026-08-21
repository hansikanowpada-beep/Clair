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

## Renaming

All in-app branding was updated from "Arogya" to "ClairMD" (not plain
"Clair" — the product name is ClairMD, domains `clairmd.net` /
`clairmd.in`):

- "Arogya Clinic" → "ClairMD Clinic" (patient home screen, discharge slip
  footer, hospital directory, hospital-affiliation form placeholders)
- `arogyaclinic.app` feedback links → `clairmd.net`
- The exported component `ArogyaEHR` → `ClairMDEHR` (file renamed
  `ClairEHR.jsx` → `ClairMDEHR.jsx` to match)
