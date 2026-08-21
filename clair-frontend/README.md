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

## Renaming

All in-app branding was updated from "Arogya" to "ClairMD" (not plain
"Clair" — the product name is ClairMD, domains `clairmd.net` /
`clairmd.in`):

- "Arogya Clinic" → "ClairMD Clinic" (patient home screen, discharge slip
  footer, hospital directory, hospital-affiliation form placeholders)
- `arogyaclinic.app` feedback links → `clairmd.net`
- The exported component `ArogyaEHR` → `ClairMDEHR` (file renamed
  `ClairEHR.jsx` → `ClairMDEHR.jsx` to match)
