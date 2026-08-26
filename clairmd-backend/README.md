# ClairMD Clinic — Platform Backend

Handles accounts/auth, Google Drive connection management, backup
telemetry, key-wrap routing, care-team instructions, referrals, and
billing/usage metadata. Since `patient_record_content`
(2026-08-21, see below) it also stores one **opaque, client-side-encrypted
blob per patient record** as an optional sync path alongside the doctor's
own Drive copy — this process never receives, stores, or reads clinical
content in **plaintext**, and has no way to decrypt what it stores. See
`src/db/schema.sql`'s header comment before adding any table or route; if
you're about to add a "diagnosis" or "notes" column that holds *readable*
text anywhere in this codebase, stop and re-read that comment.

## What's actually built and working (pending real-environment testing — see below)

- **License verification gate removed from signup — a real bug this
  caught** (2026-08-22 product decision, "deal with it later"). Since
  real verification isn't buildable yet (see the entry below this one),
  `routes/auth.js`'s signup was still calling `verifyMedicalLicense()`,
  which in any non-development environment hit the `unconfigured`
  provider and THREW — meaning doctor signup was silently broken outright
  in any real deployment, not just unverified. Removed the gate entirely
  rather than leave that trap in place. `license_number` is still
  collected and stored; `license_verified_at` now always stays `NULL` at
  signup (previously it was dishonestly set to the signup timestamp, as
  if verification had happened) until real verification exists later.
  **Live-tested**: ran the server with `NODE_ENV=production` specifically
  (the exact condition that used to throw) and confirmed a doctor signup
  now succeeds cleanly, with `license_verified_at` genuinely `NULL` in
  the database afterward — not silently marked verified.
  `services/licenseVerification.js`'s provider pattern and research are
  kept intact for whenever this gets revisited; nothing there was
  deleted, just disconnected from the signup route.

- **Real medical license verification — re-investigated (2026-08-22),
  still genuinely not buildable from here, and that's a different
  situation from everything else on this list.** The other four items
  built in this same round (hospital payment screen, care-team view,
  doctor-initiated hospital affiliation, co-admin revocation/backup) were
  all buildable AND independently testable from this sandbox. This one
  isn't, confirmed directly: both `nmc.org.in` and `www.nmc.org.in` are
  blocked by the network egress policy (a real connection attempt and a
  `WebFetch` both came back as explicit policy denials), the same way
  `api.razorpay.com` was for the Razorpay charge call. The difference
  from Razorpay: there, the base Checkout.js flow is a stable, universal,
  well-documented pattern confident enough to implement from training
  knowledge even without live verification. NMC's actual registry search
  has never been an officially documented public API to begin with (see
  `services/licenseVerification.js`'s existing research), and India has
  no single national license-number format to even sanity-check against
  — each of ~30 state medical councils sets its own. Real options from
  here: get genuine internet access to observe NMC's endpoint before
  coding against it, or sign with a commercial verification vendor (a
  business decision — cost, contract, credentials — not something to set
  up unilaterally). Left as the same honest, clearly-labeled stub,
  updated with this finding rather than silently re-confirmed.

- **Co-admin revocation** (2026-08-22) — the second of two limitations
  explicitly flagged when co-admin key-wrap crypto first shipped ("no
  revocation... needs key rotation, which is separate, larger work"). New
  `POST /coadmin/revoke` on `routes/coadmin.js`: marks the calling
  doctor's `co_admin_assignments` row revoked and deletes the former
  co-admin's `record_key_wraps` rows for that doctor's records, inside a
  single transaction so the two can't diverge. A fresh fetch attempt
  after revocation gets a plain 404, same as an account that was never
  granted access — no special-cased error path. The real "stop them
  reading anything new" mitigation (rotating each record's actual AES
  key) happens client-side, in `revokeCoAdminAccess`, before this route
  is even called — see `clair-frontend/README.md`'s matching entry.
  Deliberately does NOT and cannot retroactively un-decrypt content the
  former co-admin already fetched before revocation — no key-wrap system
  can reach into someone else's device, and this doesn't pretend
  otherwise.
  - **Live-tested end to end**: set up a full assign → wrap → consent →
    fetch cycle exactly like the original co-admin proof, confirmed the
    co-admin could fetch the wrap, revoked, confirmed the SAME fetch now
    404s, confirmed `my-wraps` is empty and `my-assignment` is null, and
    confirmed re-revoking with nothing active correctly 404s rather than
    crashing.

- **Doctor-initiated hospital affiliation requests** (2026-08-22) — until
  now, `hospital_affiliations` only supported the hospital adding a
  doctor directly and instantly (trusted, no approval step). There was no
  doctor-initiated path, and one couldn't just be added symmetrically: a
  doctor unilaterally inserting into that table would let them bill notes
  against a hospital's plan without that hospital's consent. New
  `025_hospital_affiliation_requests.sql` adds a real pending/approved/
  declined request table instead — only the hospital's own approval ever
  creates a `hospital_affiliations` row. New routes on
  `routes/hospitalAffiliations.js`: `POST /requests` (doctor creates one),
  `GET /requests/pending` (hospital's inbox), `GET /requests/mine`
  (doctor's own status history), `POST /requests/:id/approve` (creates
  the real affiliation transactionally alongside marking the request
  approved), `POST /requests/:id/decline`. A fresh request after a
  decline reuses the same row (upsert) rather than erroring or piling up
  duplicates — same pattern `hospital_affiliations` itself already used
  for re-adding after a revoke.
  - **Live-tested end to end**: a real doctor requested affiliation with a
    real hospital; confirmed no affiliation existed yet; the hospital saw
    the pending request with the real doctor name/specialty; a different
    doctor account was confirmed unable to approve/decline it (403) or
    see it in their own view; the hospital approved it, which genuinely
    created the affiliation (visible on the doctor's own `/mine`) and
    updated the request's status to `approved`; re-approving the same
    request correctly 404'd; a decline on a second hospital created no
    affiliation; and re-requesting after that decline correctly reused
    the same row instead of erroring or duplicating.

- **Care team member persona now has a real frontend caller** (2026-08-22)
  — no backend code changed; `routes/careTeam.js`'s `GET /pending` and
  `POST /:id/acknowledge` were already fully built, but nothing in
  `ClairMDEHR.jsx` ever called them — only the doctor-sending side had a
  view. **Live-tested end to end**: a real doctor account sent an
  instruction to a real `care_team_member` account, the recipient's `GET
  /pending` returned it with every real field intact (patient name, bed
  number, instruction text, sending doctor's name/specialty),
  acknowledging it via `POST /:id/acknowledge` removed it from `pending`
  and set `acknowledged_at` on the doctor's own `/sent` view, and a
  doctor account was confirmed unable to call either care-team-member-
  only route (403).

- **Hospital "add a payment method" screen — the real Razorpay Checkout
  flow, not just the stub raw-store endpoint** (2026-08-22). Two new
  routes on `routes/hospitalBilling.js`, backed by new
  `services/hospitalBilling.js` helpers:
  - `POST /setup-order` — creates a genuine Razorpay order (Orders API —
    Razorpay's most stable, most universally-documented endpoint, high
    confidence in this shape specifically).
  - `POST /setup-order/verify` — independently verifies the completed
    checkout's signature (same HMAC-SHA256 style as the webhook
    verification, but over `{order_id}|{payment_id}` instead of the raw
    body — a different, also well-documented Razorpay signature scheme),
    then fetches the payment from Razorpay directly and saves the
    resulting token via the existing `savePaymentMethod()`.
  - The existing `POST /payment-method` (raw ID store, no verification)
    is kept for flexibility but the frontend now uses the verified flow
    above instead.
  - **Honesty note on confidence**: the order-create + Checkout.js +
    signature-verify shape is genuinely well-established — every
    Razorpay integration uses it, unchanged for years. The ONE piece
    that ISN'T independently verified is the exact field names Razorpay
    returns for the resulting recurring-charge token
    (`fetchRazorpayPaymentToken`'s `customer_id`/`token_id` read) — this
    sandbox's network policy blocks razorpay.com entirely, including
    their docs, so this is based on training knowledge, not a live
    check. Flagged explicitly in the code rather than presented as
    equally certain as the rest.
  - The nominal ₹1 authorization amount (`PAYMENT_METHOD_SETUP_AMOUNT_
    PAISE`) is a clearly-labeled placeholder — how much to charge to link
    a card, and whether it's refunded, is a product decision for a human
    to confirm, not something invented here.
  - **Live-tested what's testable without reaching razorpay.com**:
    account-type gating (only `hospital` accounts can call either
    route), the signature verification's negative space (garbage/missing
    signatures always rejected), AND the positive space (a genuinely
    correct HMAC-SHA256 signature, computed independently, passes
    verification and reaches the next step — proven by getting a 502
    "network blocked" response instead of a 400 "bad signature" one).
    `/setup-order` itself was confirmed to fail gracefully (502, real
    error message, no crash) rather than silently succeed or 500.

- **Firebase push notifications — live-tested with a real service account,
  and a real scheduled entry point now exists** (2026-08-22). Unlike
  Razorpay, this sandbox's network policy does NOT block Google's
  Firebase/FCM endpoints — confirmed reachable before asking for
  credentials, so this one really could be verified, not just wired
  blind.
  - `FIREBASE_SERVICE_ACCOUNT_JSON` now holds a real Firebase service
    account key (project `clairmd-1c678`).
  - **Live-tested, genuinely**: `firebase-admin`'s credential object
    obtained a real OAuth2 access token from Google using this key
    (proves the key itself is valid), and a `send()` call through the
    real FCM API to a deliberately fake device token came back
    `messaging/invalid-argument` — a rejection of the TOKEN, not of the
    credential — meaning the entire path (this key -> Google auth -> the
    FCM API) is real and correct. The only thing not proven is delivery
    to an actual phone, since no real device has registered a token yet;
    everything up to that last mile is confirmed working.
  - New `db/deliverNotifications.js` (+ `npm run deliver-notifications`)
    — a genuine gap this closed: `services/notifications.js`'s
    `deliverPending()` existed and worked, but nothing ever actually
    called it. Mirrors `runNightlyOverageBilling.js`'s shape (a script
    entry point; wiring an actual schedule/cron is still a deployment
    decision, not made here).
  - The SMTP/email fallback half now has real Gmail credentials
    configured (`smtp.gmail.com` + an app password) but is **still not
    live-tested — for a different reason than Razorpay**. A real
    connection attempt to `smtp.gmail.com:587` (SMTP's STARTTLS port, a
    raw TCP connection, not an HTTPS request) just hung with no response
    at all — this sandbox's network proxy only handles HTTPS (port 443)
    traffic; port 587 isn't in scope for it at all, matching the proxy's
    own documented "non-443 ports, raw-TCP" unsupported list. This is an
    environment limitation, not a sign the Gmail credentials are wrong —
    try again from an environment with normal outbound network access.

- **Razorpay — real test-mode API keys configured; webhook signature
  verification live-tested; the actual charge call still isn't built, and
  here's exactly why** (2026-08-22). `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`
  (new config, `config/index.js`) now hold real Razorpay test-mode keys —
  these authenticate OUTBOUND calls this server would make TO Razorpay,
  separate from `RAZORPAY_WEBHOOK_SECRET` which verifies INBOUND calls
  Razorpay makes to us.
  - **Live-tested for real**: `routes/billing.js`'s `/webhook` signature
    verification (`verifyRazorpaySignature`, pre-existing code, never
    actually run before now) was fired at with genuine HMAC-SHA256
    payloads against a running server — a correctly-signed webhook is
    accepted, a wrong-secret signature is rejected, a tampered body with
    the original signature is rejected, and a missing signature header
    is rejected. All four passed. This needed no outbound network access
    at all (it's local HMAC math), which is exactly why it was possible
    to verify here when the piece below wasn't.
  - **`services/hospitalBilling.js`'s `attemptRazorpayCharge()` is still a
    stub, deliberately** — not because the keys are missing anymore, but
    because this sandbox's network policy blocks `api.razorpay.com` AND
    `razorpay.com` entirely (confirmed both via a direct API call and via
    `WebFetch` against their docs — both came back as policy denials, not
    bugs to route around). There is no way from here to check the
    current, exact request/response shape of Razorpay's recurring/token
    charge endpoint against their real documentation. Writing that from
    memory alone, unverified, for code that moves real money, is exactly
    what this backend's honesty standard (license verification,
    notification delivery) exists to prevent — a confidently-wrong
    implementation that *looks* finished is worse than an honest stub.
    There's also a bigger structural gap underneath either way: nothing
    in this app yet lets a hospital actually save a payment method
    (`savePaymentMethod()` exists but nothing calls it) — that needs a
    real Razorpay Checkout flow that doesn't exist anywhere in the
    frontend. Whoever implements this needs an environment with normal
    internet access to Razorpay's docs; the keys and the webhook side are
    ready and waiting for it.

- **Google Drive upload/download — the actual file transfer, not just the
  OAuth handshake** (2026-08-21). Until now, `routes/drive.js` could
  connect a doctor's Drive account (OAuth exchange, app folder creation,
  backup telemetry) but nothing ever actually used that connection to
  move a file — records were created with a placeholder `driveFileId`
  and the only place content ever landed was this backend's own
  `patient_record_content` opaque-blob store. New:
  - `GET /drive/access-token` — mints a short-lived (~1h) Drive access
    token on demand from the stored, encrypted-at-rest refresh token.
    This is the one place a Drive credential crosses this backend after
    the initial OAuth exchange, and it's still just a token — the
    frontend uses it to talk to the Drive REST API directly from the
    browser, so file content never passes through this backend at all
    (same trust model the router's own header comment already
    described, just now actually exercised).
  - `GET /drive/backup-status` now also returns `appFolderId` — not
    sensitive (a folder id, not a credential), needed so the client can
    upload straight into the right folder without a second lookup.
  - The OAuth callback page now auto-closes itself (`window.close()`)
    once the connection is stored, since the frontend drives the whole
    flow via a popup + polling `GET /backup-status` rather than a
    postMessage handshake — simpler, and doesn't depend on a
    same-origin relationship between the popup and opener holding up
    across browsers.
  - No changes to `POST /oauth/start`, `GET /oauth/callback`'s actual
    exchange logic, or `POST /backup-events` — all already correct.
  - **Live-tested** against a real running stack (Postgres + Express):
    confirmed `backup-status` correctly reports `connected: false` /
    `appFolderId: null` before any connection, `access-token` correctly
    404s before connecting and 401s with no auth at all, and
    `oauth/start` returns a genuine `accounts.google.com` consent URL
    carrying the account id as `state`. What is **not** live-tested: the
    actual OAuth consent screen and a real upload/download round trip —
    both need a real Google Cloud OAuth client, which doesn't exist in
    this sandbox. See `clair-frontend/README.md`'s matching entry for
    the Google Cloud Console setup steps needed before that becomes
    possible.

- **Co-admin assignment — the doctor side is now real, not just consent**
  (2026-08-21) — supersedes the earlier note further down in this file
  that said the assigning side "needs real per-recipient key-wrap crypto
  this prototype doesn't have." It now does. New:
  - `024_account_public_keys.sql` adds `accounts.public_key` (nullable
    TEXT) — an RSA-OAEP public key, SPKI-encoded, base64. Only the public
    half is ever stored server-side; the matching private key is
    generated in the browser and never sent here (see `ClairMDEHR.jsx`'s
    `getOrCreateKeyPair`). A public key isn't sensitive by definition, so
    this needed no new access control — just a place to put it.
  - `PUT /api/auth/public-key` — any authenticated account publishes its
    own public key. `GET /api/auth/me` now also returns `public_key`.
  - `routes/accountDirectory.js`'s search now also returns `public_key`
    per result — needed so a doctor picking a co-admin can wrap that
    record key immediately, without a second round trip. Still never
    returns email/phone; a public key is the one field in this table
    that's supposed to be public.
  - Two new read routes on `routes/coadmin.js`, both previously missing
    entirely: `GET /coadmin/my-assignment` (a doctor's own current
    co-admin, if any — `/assign` was write-only before, with no way to
    check what's currently set) and `GET /coadmin/my-wraps` (every key
    wrap the calling account holds — the co-admin's own "which records
    was I actually given access to" view; before this, the only read
    route was `GET /key-wraps/:patientRecordId`, which is useless without
    already knowing a record id to ask about).
  - No changes to `POST /coadmin/assign`, `POST /coadmin/key-wraps`, `POST
    /coadmin/consent`, or `GET /coadmin/key-wraps/:patientRecordId` — all
    four already had everything the new frontend flow needed; this only
    added what was missing around them.
  - **Known, deliberately out-of-scope limitations**, same ones flagged
    to the user before building this: no key backup/recovery (a private
    key lives in exactly one browser; a second device can't unwrap
    anything wrapped for the first device's public key, and the frontend
    refuses to silently generate a second keypair and orphan the first),
    and no revocation (removing a co-admin's `record_key_wraps` row
    doesn't stop them from decrypting a copy they already fetched — real
    revocation needs key rotation, i.e. re-encrypting content with a new
    key and re-wrapping it for everyone still authorized, which is
    meaningfully more work and wasn't attempted here).
  - **Live-tested against a real, running stack** — this is the first
    thing in this backend actually run end to end rather than just read
    for correctness. Started a real Postgres 16 instance, applied all 24
    migrations fresh (including this one), ran the real Express server,
    and drove the full protocol over real HTTP with genuine RSA-OAEP/
    AES-GCM WebCrypto operations: two doctor accounts, a patient account,
    a real record, a real key wrap, and a real decrypt that produced back
    the exact original plaintext. Also checked the negative paths: an
    uninvolved third doctor gets 404 on both the record content and the
    key wrap (no leak), and a patient revoking consent immediately locks
    the co-admin out again (403). The same flow was then also driven
    through a real Chromium browser against the real frontend file (see
    `clair-frontend/README.md`'s matching entry) — that pass caught and
    fixed one genuine bug in `CoAdminPanel`'s key-publish timing.

- **Founder/admin dashboard now has a real frontend caller** (2026-08-21) —
  no backend code changed here; `routes/admin.js`'s four read-only routes
  were already fully built (see the 2026-08-18 entry further down), but
  until now nothing in `ClairMDEHR.jsx` could reach them. Frontend adds a
  new `AdminDashboardView`, a whole separate top-level app mode
  (`appMode === "admin"`) alongside "clinic" and "patient" — entered via a
  small, deliberately unobtrusive "Founder admin →" link under the sidebar
  logo, not a normal nav item, since this isn't a persona a doctor or
  patient account can use. Login-only, no signup tab, matching the
  backend exactly: `admin` has no entry in `routes/auth.js`'s signup
  schema at all, so there's nothing to sign up for. After a successful
  login it checks the returned `account_type` — a real password on a
  non-admin account still gets bounced with an explicit "this isn't a
  founder-admin account" message and the token is dropped, rather than
  silently rendering an empty or 403-riddled dashboard. Once connected as
  a genuine admin account, it fetches and renders all four routes:
  `/overview` (accounts by type, plan tiers, signups this month vs last,
  this month's revenue), `/hospitals-at-risk`, `/backup-health`, and
  `/notification-health`, with a manual refresh button and an explicit
  error banner if any call fails rather than failing silently — this view
  exists specifically to surface platform problems, so a swallowed error
  here would defeat the point. Shares the same single browser-wide auth
  token as every other backend-sync surface in this prototype (see
  `ClairMDEHR.jsx`'s module comment above `getApiBase()`), so logging in
  here replaces whatever doctor/patient session was active before — a
  known limitation, not new to this change.
- **Notifications, patient records/consent, billing, and data rights now
  have real frontend callers** (2026-08-21) — no backend code changed for
  these four (`routes/notifications.js`, `routes/patient.js`,
  `routes/billing.js`'s `GET /plan`/`GET /history`, and
  `routes/dataRights.js` were already fully built), but until now nothing
  in `ClairMDEHR.jsx` ever called them. Also newly wired:
  `POST /api/coadmin/consent` (a patient granting/declining co-admin
  access) — this needs no client-side crypto to call, unlike the rest of
  `coadmin.js`, since it's a plain boolean gate on an already-submitted
  key wrap. What's still NOT wired from the frontend: the other side of
  co-admin (a doctor assigning a co-admin and wrapping a record's key for
  them), since that genuinely needs real per-recipient key-wrap crypto
  this prototype doesn't have yet.
- **Account directory search** (2026-08-21, `routes/accountDirectory.js`,
  new, no migration needed — it only reads `accounts`) — a real gap this
  closed: referrals and care-team instructions both require a real
  recipient account id, but nothing let a doctor find one. `GET /api/
  account-directory?q=...&types=individual_doctor,hospital_doctor` (or
  `care_team_member`) searches `display_name`/`specialty` and returns only
  `id`/`display_name`/`specialty`/`account_type` — never email/phone,
  minimal-disclosure by design. Requires 2+ query characters (returns `[]`
  below that, avoiding a full-table scan on every keystroke) and excludes
  the caller's own account and any deactivated one. **Not scoped** to the
  caller's own hospital/affiliations — every doctor can currently find
  every other doctor platform-wide; narrowing that is a real feature, not
  built here, flagged rather than silently assumed.
- **Referrals and care-team instructions — recipient names in listings**
  (2026-08-21, `routes/referrals.js`, `routes/careTeam.js`) — `GET /inbox`,
  `GET /sent`, and `GET /pending` previously returned only the recipient's
  raw account id, which the frontend has no way to turn into a display
  name on its own. Added a `JOIN accounts` to each so the response now
  carries `from_doctor_name`/`to_doctor_name`/`to_care_team_name` (+
  specialty where relevant) alongside the id. Purely additive — no
  existing field removed or renamed, so this can't break anything already
  reading these responses.
- **Feed post approval requests** (2026-08-21, `023_feed_post_requests.sql`
  + `routes/feedPostRequests.js`) — the last piece of the specialty feed:
  in `WritePostModal`, a doctor can ask to post about a *specific
  patient's* case instead of a general update, and nothing goes live
  until that patient approves it (`PatientInboxTab`'s "Post approvals"
  tab). This had no backend at all until now, same as the four features
  above it in this file.
  - `patient_account_id` is **nullable at creation** — same reasoning as
    `patient_followups`: nothing in this prototype links a mock
    `PATIENTS` entry to a real backend account, so a request is created
    addressed to a NAME (`patient_display_name`), not an account id.
    `GET /api/feed-post-requests/pending-for-me` matches pending requests
    against the *caller's own* `display_name` — a name match, not a
    foreign-key join, deliberately as loose as the frontend's own
    matching (`r.patientName === patient.name`) already is.
  - The request only gets **claimed** — `patient_account_id` set — the
    moment a genuinely authenticated patient whose display name matches
    actually responds (`POST /:id/approve` or `/:id/decline`). At that
    point the response is unambiguously real no matter how loosely the
    request itself was addressed going in.
  - `POST /:id/approve` creates the real `feed_posts` row (`kind:
    'case_highlight'`, a new enum value added via `ALTER TYPE ... ADD
    VALUE` — same pattern and same Postgres-12+ caveat as `admin` in
    `016_admin_dashboard.sql`) and updates the request to `approved` in
    one transaction, so a mid-flight failure can never leave an approved
    request with no matching post or vice versa. `text` is accepted from
    the client rather than recomposed server-side — the frontend already
    builds it deterministically (`formatCaseHighlight`), so the stored
    post stays byte-identical to what the patient actually saw and
    approved rather than risking drift from a second composition.
  - **Not live-tested** — no database in this sandbox. Checked instead:
    the migration is valid standalone SQL, the route file passes
    `node --check`, every `require()` path resolves, and the approve
    transaction (`BEGIN`/insert/update/`COMMIT`, with `ROLLBACK` on any
    error) was manually walked against `pg`'s standard client-checkout
    pattern already used correctly elsewhere in this codebase (verified
    directly, not assumed — `routes/billing.js`'s webhook handler is the
    other place that acquires its own client for a real transaction).

- **Patient follow-ups, hospital bed/inventory operations, and the
  specialty feed** (2026-08-21, migrations `019`–`022` + `routes/
  followUps.js`, `routes/bedAvailability.js`, `routes/inventory.js`,
  `routes/feedPosts.js`) — four more ClairMDEHR frontend features that had
  zero backend behind them (state only ever lived in React, gone on
  refresh), closing out the last of the 11-item gap list surveyed
  2026-08-21.
  - **Patient follow-ups** (`019_patient_followups.sql`,
    `/api/follow-ups`): a doctor's short post-visit plan (check-in
    interval, takeaways, complications, diet/physio, precautions, next
    visit) plus the doctor↔patient message thread built around it.
    Deliberately **plaintext**, unlike `patient_record_content` — same
    reasoning as `care_team_instructions`' plaintext `diagnosis_summary`:
    the whole point is the patient reads this directly in their own
    portal. `POST /`/`GET /` are doctor-only (their own plans); `GET
    /mine` is the patient's own linked plans; `GET`/`PATCH /:id` and the
    `/:id/messages` sub-routes check the caller is either the plan's
    doctor or its linked patient, never trusted from the URL alone.
    `isAdviceLink`/`linkExpiresAt` on a message mirror the frontend's
    existing 24-hour feedback-link pattern — the client still builds the
    link text itself, this just stores the flag/expiry alongside it.
  - **Hospital bed availability** (`020_hospital_bed_status.sql`,
    `/api/bed-availability`) and **inventory** (`021_inventory_items.sql`,
    `/api/inventory`): both self-managed, hospital-account-only, pure
    operational status/logistics — no clinical content, no dosing, no
    prescribing decisions, so (matching the frontend's own comment on
    this feature) neither sits anywhere near a device-classification
    concern the way the clinical modules elsewhere in this app
    deliberately do. Inventory has a dedicated `POST /:id/adjust`
    (`{ delta }`) separate from the general `PATCH /:id`, so a quick
    stock +/- can never accidentally piggyback other field edits in the
    same request.
  - **Specialty feed posts** (`022_feed_posts.sql`, `/api/feed-posts`):
    doctor-authored updates patients view and react to. Also plaintext,
    same reasoning as follow-ups above. Like/dislike counts are computed
    by aggregating a `(post_id, account_id)`-keyed reactions table at read
    time rather than maintained as counters, so a changed or withdrawn
    reaction can never drift out of sync with what's displayed;
    `POST /:id/react` toggles (sending the same reaction again removes
    it). A per-doctor `feed_post_expiry_months` setting (new column on
    `accounts`, default 6) controls how long that doctor's posts stay in
    the `GET /` listing.
    - **Known simplification, flagged rather than silently assumed
      built:** the frontend's own comment says "patients see posts only
      from doctors they already follow," but no doctor-follow
      relationship exists anywhere in this backend yet —
      `GET /api/feed-posts` currently returns ALL non-expired posts
      platform-wide to any authenticated account. A real following/
      subscription system is a separate feature, not built here.
  - **Not live-tested** — no database in this sandbox for any of these
    four. Checked instead: every migration is valid standalone SQL (each
    file's own `CREATE TYPE`/`CREATE TABLE` statements, no `ALTER TYPE`
    risk), every route file passes `node --check`, every `require()`
    path resolves, and every query was manually walked against the
    tables/columns it reads or writes, including the two route-ordering
    bugs this actually caught before being flagged as "done": `PATCH
    /settings` in `feedPosts.js` and `GET /mine` in `followUps.js` had to
    be registered *before* their respective `/:id` routes, since Express
    matches routes in registration order per method and `:id` would
    otherwise have silently swallowed `"settings"`/`"mine"` as a record
    ID on the first request that hit it.
  - **Frontend wiring not done in this change** — backend-only, same as
    lab orders below before it was wired up separately.

- **Lab orders** (2026-08-21, `018_lab_orders.sql` + `routes/labOrders.js`) —
  the ClairMDEHR frontend prototype has an "order a test" UI (blood/urine/
  radiological/microbiological/immunological, per `DIAGNOSIS_META`'s fixed
  test lists) with zero backend behind it — orders only ever lived in
  React state, gone on refresh. `lab_orders` is a real, structured table,
  and deliberately **not** encrypted like `patient_record_content`: the
  whole point of an order is that a party without chart access (a lab
  tech, or just the doctor checking status later) needs to read what test
  was ordered and whether it's done, without holding any decryption key.
  Same reasoning `care_team_instructions` (`007_care_team_instructions.sql`)
  already uses for its plaintext `diagnosis_summary` column — bounded,
  structured, task-scoped metadata is a different thing from the free-text
  clinical narrative `schema.sql`'s header bans from this database.
  - `POST /api/lab-orders` (primary doctor only, verified against
    `patient_record_index.primary_doctor_id`) creates an order in
    `pending` status. `GET /api/lab-orders` lists the calling doctor's own
    orders across all their patients (optionally `?patientRecordId=...` to
    scope to one record), matching `records.js`'s own "list my records"
    convention. `PATCH /api/lab-orders/:id` updates `status` and/or a
    brief `resultNote`; `completed_at` is set/cleared server-side purely
    from the `status` transition, never accepted as a client-supplied
    field.
  - **No tier/usage gate**, on purpose — ordering a test isn't part of the
    OPD/ICU-Ward note-creation quota in `services/tierAccess.js`, it's a
    separate, unlimited clinical action, same stance as everything else
    in this backend that isn't note creation itself.
  - **Not live-tested** — no database in this sandbox. Checked instead:
    the migration is valid standalone SQL (two `CREATE TYPE` enums plus one
    `CREATE TABLE`, no `ALTER TYPE` risk), the route file passes
    `node --check`, every `require()` path resolves, and the ownership
    check + all three queries were manually walked against the existing
    `patient_record_index` shape they join against/reference.
  - **Frontend wiring not done in this change** — this is backend-only;
    `ClairMDEHR.jsx`'s `orderTest`/`labOrders` state still isn't calling
    these endpoints yet.

- **Patient record content sync** (2026-08-21, `017_patient_record_content.sql`
  + `routes/recordContent.js`) — the frontend's ClairMDEHR prototype builds a
  full OPD/ICU-Ward note client-side (history, vitals, all 11 examination
  systems including their new Present/Absent findings, differential
  diagnosis, workup, plan, etc.), and until now this backend had no way to
  persist any of it — `patient_record_index` is pointer-only, by design.
  `patient_record_content` adds exactly one thing: a place to sync that
  note as a single **opaque, client-side-encrypted blob**, one per
  `patient_record_index` row — same trust model as `emergency_profiles`
  (`011_emergency_access.sql`), same reasoning: this process stores and
  routes ciphertext it cannot itself decrypt, so the "never plaintext
  clinical content" rule at the top of `schema.sql` holds regardless of
  what gets synced here. Deliberately an ADDITIONAL path alongside the
  doctor's own Drive copy (`drive_file_id`), not a replacement — a client
  can write to Drive, to this endpoint, or both; this backend enforces no
  preference between them.
  - `PUT /api/record-content/:recordId` (primary doctor only, verified
    against `patient_record_index.primary_doctor_id` rather than trusted
    from the URL) accepts `{ encryptedBlob }` and upserts it, bumping
    `blob_version` on every re-sync the same way `emergency_profiles`
    does. `GET /api/record-content/:recordId` is readable by the primary
    doctor OR anyone holding a `record_key_wraps` row for that record —
    the exact same access predicate `records.js`'s `GET /:id` already
    uses for the pointer, so content visibility never exceeds pointer
    visibility. Actual decryption still requires fetching the wrapped key
    separately through `/api/coadmin/key-wraps/:id`, which stays
    consent-gated for co-admins exactly as before — this change doesn't
    touch that gate at all.
  - **No tier/usage check on either route**, on purpose, matching this
    backend's existing "editing an existing record is never restricted"
    stance (same as `records.js`'s `PATCH`) — quota is enforced once, at
    record creation (`POST /api/records`), and syncing a record's content
    is editing, not creating.
  - **Not live-tested** — no database in this sandbox to run the migration
    or the insert/select against. Checked instead: the migration is valid
    standalone SQL (a straightforward single `CREATE TABLE`, no
    `ALTER TYPE` risk like `016`'s), the route file passes `node --check`,
    every `require()` path resolves, and the two queries were manually
    walked against the new table's columns and the existing
    `record_key_wraps`/`patient_record_index` shapes they join against.
    Treat this the same as everything else in this section not explicitly
    marked "live-tested": carefully written, not yet proven against a
    real Postgres instance.

- **Founder/admin dashboard** (2026-08-18) — a real gap until now: every
  route in this backend assumed the caller was a doctor, hospital,
  patient, or care-team member. There was no way for you to see
  platform-wide health without querying the database directly. Now
  built: a new `admin` account type (migration `016_admin_dashboard.sql`
  — note this uses `ALTER TYPE ... ADD VALUE`, which works inside a
  transaction on Postgres 12+ but not older versions, flagged since this
  couldn't be tested against a real database here), deliberately **not
  reachable through public signup** — `admin` isn't in
  `routes/auth.js`'s signup schema (verified directly, not assumed), so
  the only way to create one is the standalone `npm run create-admin
  <email> <password>` script, matching the same "no unsafe action
  exposed as a public endpoint" discipline as the account-erasure
  script.
  - `routes/admin.js` (all gated to `account_type = 'admin'`, entirely
    read-only — nothing here lets an admin modify anyone's data, only
    view aggregates): `/overview` (accounts by type/tier, signups this
    month vs last, this month's revenue), `/hospitals-at-risk`
    (currently-restricted hospitals + pending overage broken down per
    hospital — the "who needs a call" view), `/backup-health` (Drive
    backup failure rate across the whole platform over the last 7 days —
    useful since a silently-failing backup is a real risk to a doctor's
    patient records even though this backend never sees the backed-up
    content itself), `/notification-health` (delivered vs undelivered
    over 7 days — mostly meaningful once real FCM/SMTP credentials
    exist; until then, expect everything undelivered, which is itself a
    useful "credentials aren't configured yet" signal).
  - **Live-tested** the bootstrap script's validation logic with a
    mocked pool and a stubbed `bcrypt` (native module, can't be
    installed in this sandbox either) — confirmed it genuinely rejects
    a too-short password and genuinely creates an account on a valid
    one.

- **Hospital bed-tier billing + overage system** (2026-08-18, same day as
  the affiliations work above): ICU/Ward notes are now **hospital-only**
  — an individual/solo doctor account is blocked outright from creating
  one (clear error, not a silent zero-cap), OPD notes are unaffected and
  keep the existing free/basic/elite limits. A hospital's ICU/Ward quota
  is derived from `bed_count x 3 notes/bed/day x included days for their
  hospital_plan_tier` (free=3, basic=10, elite=20, elite_plus=30 included
  days — placeholders pending final confirmation, see
  `services/tierAccess.js`). **Never blocks patient documentation** —
  hospital ICU/Ward notes past quota are still created every time; they're
  instead recorded in a new `overage_entries` table for nightly billing.
  - **Nightly billing, not month-end** (deliberate, to cap unpaid
    exposure at ~a day instead of a month): `npm run
    nightly-overage-billing` / `db/runNightlyOverageBilling.js` groups
    pending overage entries by hospital, charges hospitals with a
    payment method on file, marks entries `no_payment_method` for those
    without one. **The actual Razorpay charge call
    (`attemptRazorpayCharge()`) is an honest stub** — same standard as
    license verification and notification delivery elsewhere: real
    credentials and live testing are needed before this collects real
    money, flagged clearly rather than pretended to work.
  - **Payment method collection is deferred, not upfront** (product
    decision): hospitals start using the app with no payment method on
    file at all — `POST /api/hospital-billing/payment-method` only gets
    called once a hospital first hits overage (the client watches for
    the `overage: true` flag `POST /api/records` now returns). Only
    stores Razorpay's own tokenized customer/method references, never
    raw card data.
  - **Admin-only restriction, never patient data** — a hospital with
    unresolved overage AND no payment method gets `admin_restricted_at`
    set, gating administrative actions only
    (`middleware/adminRestriction.js`, currently applied to adding a new
    doctor via hospital-affiliations). Reading/editing existing patient
    records and creating new notes are **never** gated by this, on
    purpose — restricting either would be a real patient-safety risk,
    not just a business tradeoff, and would contradict the "editing
    existing records is never restricted" principle held everywhere
    else in this backend.
  - Anti-gaming approach: deliberately NOT document/bed-count
    verification at signup. A hospital under-declaring its bed count to
    get a cheaper tier just hits its (smaller, honestly-calibrated)
    quota faster and pays real per-note overage sooner — the cost
    structure discourages lying without needing to police it.
  - **Live-tested** with a mocked pool: confirmed an individual doctor
    is genuinely blocked from ICU/Ward note creation with the correct
    reason code; confirmed a 50-bed Basic hospital's quota computes to
    exactly 1,500 (50 x 3 x 10) and that creating a note at 1,499/1,500
    is allowed with `overage: false` while at exactly 1,500/1,500 it's
    still allowed but `overage: true`; confirmed a hospital with pending
    overage and no payment method gets restricted, and confirmed one
    with a payment method on file does NOT get pre-emptively restricted.
  - **Open question, not decided:** should hospital OPD note volume also
    have its own cap, or stay unlimited (their revenue being the
    bed-tier subscription)? Currently unlimited by default — flagged in
    `tierAccess.js` rather than silently assumed.
  - **Placeholder, not a real number:** the per-overage-note charge
    (`OVERAGE_RATE_PAISE` in `services/hospitalBilling.js`, currently
    Rs. 5.00/note) has no real infrastructure-cost analysis behind it.

- **Hospital affiliations + dual-practice billing** (2026-08-18 product
  decision, `routes/hospitalAffiliations.js` + `services/
  hospitalAffiliations.js` + `services/tierAccess.js` + `routes/
  records.js`): reflects the real pattern of a doctor working hospital
  shifts AND running their own private clinic — one account, two
  independent billing contexts, not two logins. A hospital adds a doctor
  via `POST /api/hospital-affiliations`; the doctor sees their
  affiliations via `GET /api/hospital-affiliations/mine`. When creating a
  note, an optional `hospitalContextId` picks which plan it counts
  against — omitted, it bills the doctor's own personal plan (unchanged
  default); provided, it must be a hospital the doctor has a **verified,
  active** affiliation with (checked against a real `hospital_affiliations`
  row, never just trusted from the request body) and bills that
  hospital's plan instead. `primary_doctor_id` always stays the actual
  doctor either way — only `billing_context_id` changes. **Live-tested**
  with a mocked pool: confirmed a doctor's personal usage (4/5 ICU,
  free tier) and their affiliated hospital's usage are tracked as
  genuinely separate counters, confirmed affiliation checks correctly
  return true/false, and confirmed incrementing one context's usage never
  touches the other's.
  - Hospital billing itself: `accounts.hospital_plan_tier`
    (`free`/`basic`/`elite`/`elite_plus`) and `accounts.bed_count` are new
    columns, deliberately a SEPARATE tier enum from individual doctors'
    `plan_tier` since hospital pricing scales by bed count, not note
    volume. **Hospital note caps are an explicit placeholder** — every
    hospital tier currently defaults to unlimited notes in
    `tierAccess.js`, because no actual cap numbers have been decided for
    hospitals (only the bed-count price bands have). Flagged clearly in
    the code rather than presented as a considered decision.
  - Anti-gaming approach, deliberately NOT document-upload verification:
    a hospital-scale customer could always just have each doctor sign up
    individually to dodge hospital pricing — rather than try to police
    that, the hospital tier is built to do things a pile of individual
    accounts genuinely can't replicate (this affiliation system enabling
    a real shared roster, plus planned centralized billing and hospital-
    wide care-team routing) so there's a real incentive to use it
    honestly rather than a compliance burden trying to catch cheaters.

- **Versioned database migrations.** `schema.sql` (11 tables) is now
  split into 11 numbered files under `db/migrations/`, applied by
  `db/migrate.js` — a small, hand-rolled runner (not a dependency like
  node-pg-migrate; this sandbox couldn't verify an external package's
  exact behavior without network access, so a fully-readable runner felt
  more trustworthy than an unverified one). Tracks what's applied in a
  `schema_migrations` table, only runs what's new, each migration in its
  own transaction so a failure rolls back cleanly instead of leaving the
  schema half-changed. `schema.sql` is kept as a reference snapshot of
  the whole schema at a glance — it's not what actually gets applied
  anymore, `migrate.js` is. Verified the split didn't lose or alter
  anything: every migration file individually balance-checked, and the
  concatenation of all 11 compared statement-for-statement against the
  original `schema.sql` and confirmed identical.
- **Auth** (`/api/auth`): signup, login, `/me`. License verification is a
  dev-mode stub — see the comment on `verifyMedicalLicense()` in
  `routes/auth.js`. **Do not deploy to production until that's wired to a
  real registry.**
- **Drive connection** (`/api/drive`): OAuth start/callback, backup
  telemetry recording, backup status for the doctor's own status screen.
  File-scope-only OAuth (`drive.file`), non-descriptive app folder name.
- **Co-admin key routing** (`/api/coadmin`): assignment, key-wrap
  submission, per-patient consent gate, gated key retrieval. Consent
  endpoint now verifies the caller is genuinely the patient tied to the
  record (previously a flagged TODO — closed).
- **Patient-facing routes** (`/api/patient`): a patient's own linked
  records, and any co-admin consent decisions still awaiting their
  response.
- **DPDP data rights** (`/api/data-rights`): a full export of everything
  this platform database holds for the account (`/export`), and account
  deactivation with password re-confirmation (`/deactivate`, soft delete).
  Deliberately scoped to platform metadata only — clinical content lives
  in the doctor's own Drive and isn't something this backend can reach or
  purge. Permanent/hard erasure is NOT built — see the file-level comment
  in `routes/dataRights.js` for why that's a legal/retention-policy
  decision, not something to invent here.
- **Emergency profile** (`/api/emergency-profile`) — the design question
  flagged earlier is resolved: **encrypted, offline-capable, per the
  user's decision (2026-08-18).** This backend only syncs an opaque
  encrypted blob (`PUT`/`GET /`) for backup and multi-device durability —
  it never sees plaintext or holds the decryption key. The actual
  emergency read is designed to work with zero connectivity once a device
  already has the blob and its local key cached; this backend isn't in
  that critical path. Because of that, the usual misuse protections
  (mandatory reason, rate-limiting) can't be enforced in real time — a
  client-reported audit log (`POST`/`GET /access-log`) exists instead, so
  every unlock is still recorded and reviewable once connectivity
  returns, even though it couldn't be gated at the moment it happened.
  See the file-level comments in `routes/emergencyProfile.js` and the
  `emergency_profiles`/`emergency_access_events` comments in `schema.sql`
  for the full reasoning — flagged as a real, deliberate tradeoff of the
  offline-first choice, not an oversight.
- **Notifications** (`/api/notifications`): a real, working queue —
  `services/notifications.js`'s `enqueue()` is now genuinely called from
  care-team instruction creation/acknowledgment and referral creation/
  response, and the client can list/mark-read via this router. What's
  still NOT built: actual push/email delivery (`deliverPending()` is a
  clearly-labeled stub) — so right now a recipient only sees a new
  notification if they poll `GET /api/notifications`, not via a real push.
- **Auth rate limiting**: `/api/auth/login` and `/api/auth/signup` now
  have their own stricter limits layered on top of the global one (8
  login attempts / 15 min keyed on IP+email, 5 signups / hour per IP) —
  closes the "per-route rate limiting" gap flagged earlier.
- **Patient record index** (`/api/records`): pointer-only CRUD (create,
  list, get, update, delete), plus free-tier usage tracking (5 full-service
  entries/month) that *reports* usage status without hard-blocking — the
  client decides what "basic info only" looks like past the limit.
- **Care team instructions** (`/api/care-team`): create, list pending,
  acknowledge, sent-history.
- **Referrals** (`/api/referrals`): create, inbox, sent, respond
  (acknowledge/decline).
- **Billing** (`/api/billing`): plan/history read, a manually-authenticated
  event-recording endpoint for dev/testing, AND a real Razorpay webhook
  (`/webhook`) with genuine HMAC-SHA256 signature verification — **this
  one was actually live-tested**, not just statically checked (Node's
  `crypto` module is built in, no network install needed) — confirmed a
  correct signature is accepted, a wrong one/wrong secret/tampered body/
  missing header are all rejected. What's still a placeholder: the
  Razorpay plan-ID → `plan_tier` mapping (`RAZORPAY_PLAN_TIER_MAP`) is
  empty until real plans exist in an actual Razorpay dashboard — filling
  in guessed IDs would silently misattribute a doctor's tier, so it's
  left empty on purpose rather than guessed.
- **Push/email notifications.** `services/notifications.js` now has real
  delivery code — FCM push (via `firebase-admin`) and an SMTP email
  fallback (via `nodemailer`) — against well-documented, stable APIs, not
  a stub. Device tokens register via `POST /api/notifications/device-
  token`. Gracefully self-disables (logs and skips, doesn't throw) when
  `FIREBASE_SERVICE_ACCOUNT_JSON`/`SMTP_*` aren't configured, so a
  scheduler calling `deliverPending()` doesn't crash on every run before
  credentials exist. **Genuinely not proven to work end-to-end** — this
  sandbox can't install `firebase-admin`/`nodemailer` or hit real
  credentials, so this is "carefully written against documented APIs,"
  the same honest standard as the rest of this backend, not "tested."
- **Medical license verification** (`services/licenseVerification.js`):
  researched rather than guessed. NMC's public Indian Medical Register
  search is real and does cover 1.4M+ doctors, but the API backing it is
  undocumented/reverse-engineered by third parties, not an officially
  supported contract — building against it blind risked silently getting
  the request/response shape wrong (worse than an honest stub). Built a
  clean provider-interface instead, with the research documented in the
  file, so wiring in a real source (a commercial API like Surepass/Meon,
  or a properly tested NMC integration) later is a small, isolated
  change.
- **Pricing/tier limits — final structure** (last revised 2026-08-18,
  `services/tierAccess.js` + `routes/records.js` +
  `services/hospitalBilling.js`):

  **Individual doctors / solo clinics** — OPD only, no ICU/Ward at all
  (an individual account is blocked outright from creating an ICU/Ward
  note, with a clear error naming why, not a silent zero-cap):
  - Free: 10 OPD notes/month
  - Basic — ₹999 + GST/month: 100 OPD notes/month
  - Elite — ₹1,999 + GST/month: unlimited

  **Hospitals** — bed-count-scaled, ICU/Ward is hospital-only:
  - Free (≤10 beds): 3 included days/month → quota = beds × 3 notes/bed/day × 3 days. OPD capped at 25/month.
  - Basic (11–50 beds) — ₹4,999 + GST/month: 10 included days → up to 1,500 ICU notes/month at 50 beds. OPD capped at 250/month.
  - Elite (51–150 beds) — ₹14,999 + GST/month: 20 included days → up to 9,000 ICU notes/month at 150 beds. OPD unlimited.
  - Elite Plus (150+ beds) — ₹29,999 + GST/month, or custom quote above ~300 beds: **ICU/Ward and OPD both genuinely unlimited** — simplified from an earlier "30 included days" design to match how individual-doctor Elite is unlimited too, rather than a large-but-finite number.
  - Hospital ICU/Ward **never blocks** past quota (patient care is never refused) — instead recorded as billable overage. Hospital OPD, by contrast, **does hard-block** past its cap on Free/Basic (same shape as individual doctors) — OPD was never designed with an overage-billing path, only ICU/Ward has one.
  - **Overage rate, by hospital tier** (`OVERAGE_RATE_PAISE_BY_TIER` in
    `services/hospitalBilling.js`): Free ₹25/note, Basic ₹15/note, Elite
    ₹8/note — deliberately decreasing as tier increases, mirroring the
    base subscription pricing (bigger hospitals get better per-unit
    economics), and kept meaningfully above what a hospital already
    effectively pays per note inside their own included quota, so
    staying in overage indefinitely never beats upgrading tier. Elite
    Plus has no entry — never applicable, since its ICU/Ward is
    unlimited.
  - An earlier version of `getUsageStatus` had a real bug: comparing
    `usage >= quota` when `quota` was `null` (unlimited) would silently
    coerce `null` to `0` in JS, incorrectly reporting `overage: true`
    for high-usage Elite Plus hospitals. Caught and fixed before
    shipping — `getUsageStatus` now explicitly checks `quota !== null`
    first. **Live-tested**: confirmed Elite Plus never shows overage
    even with 999,999 recorded notes; confirmed a 50-bed Basic
    hospital's quota computes to exactly 1,500 and blocks (for OPD) /
    flags overage (for ICU) at precisely the right boundary; confirmed
    the tiered overage-rate lookup returns the correct paise amount per
    tier and fails safe to the steepest (Free) rate on an unrecognized
    tier value rather than silently undercharging.

  **Both individual and hospital plans**: every account separately pays
  for their own Google Workspace Business Base (~₹100/month) for Drive
  storage — a completely different cost from any of this, untouched by
  any of this logic. Reading and editing already-existing records is
  **never** restricted by any tier or billing state, on every plan,
  without exception.

- **Emergency-access reason taxonomy — now locked** (2026-08-18): closes
  a real gap. The frontend's emergency-access dropdown always offered
  exactly 4 options ("Found unresponsive," "Visible injury," "Confused /
  disoriented," "Other medical emergency"), but the backend previously
  accepted *any* string for the audit-log `reason` field — meaning a
  modified or different client could have sent something the UI never
  actually offers. `routes/emergencyProfile.js`'s validation now uses
  `z.enum(EMERGENCY_ACCESS_REASONS)` matching those exact 4 values,
  verified character-for-character against the frontend prototype file
  rather than retyped from memory.
- **Permanent account erasure**
  (`npm run erase-deactivated` / `db/eraseDeactivatedAccounts.js`): a
  real, careful script — dry-run by default (needs `--confirm` to
  actually delete anything), respects the schema's existing safeguard
  that a doctor can't be erased while patients still reference them
  (the offboarding checklist has to run first). The retention period
  (`DATA_RETENTION_DAYS`, default 365) is explicitly flagged as a
  placeholder, not a legal recommendation — confirm the real number
  before relying on it for anything but local testing.

## What's honestly NOT built yet

- **Emergency profile — client-side encryption itself.** The backend sync
  layer exists, but the actual client-side pieces — deriving and storing
  the encryption key in the device's secure hardware storage, the
  fingerprint-gated unlock UI, encrypting the profile before it's ever
  sent to this backend — are frontend/mobile work, not backend, and
  aren't built here. Also open: the reason-code taxonomy for the
  mandatory-selection dropdown (the backend currently accepts any
  non-empty string).
- **Actually filling in the Razorpay plan-ID map and getting real
  Firebase/SMTP credentials configured** — both are placeholders/empty by
  design until those real values exist.

## I could not actually run this in the sandbox this was built in

This container has no network access to the npm registry (`npm install`
fails with a 403 on every package). Everything above was built and
verified as thoroughly as that constraint allows:

- Every file passes `node --check` (syntax-valid).
- Every local `require()` path resolves to a real file.
- Every module's exports match how other files destructure/use it.
- Careful manual review against the existing, already-verified files
  (`auth.js`, `drive.js`, `coadmin.js`) for consistent conventions.

**What this does NOT verify:** that the code actually runs correctly
against real Express/pg/etc. at runtime, that SQL queries are free of
typos that only surface at execution time, or that the Google OAuth flow
actually works end-to-end. That needs a real environment. Treat this as
carefully-written, not yet proven — the way you'd treat code review
without a test run, because that's genuinely what this is.

## How to actually test it, once you have network access

```bash
cd clairmd-backend
npm install                          # will work once network access exists
cp .env.example .env                 # then fill in real values — see comments in that file
# needs a real Postgres reachable at DATABASE_URL — a local Docker
# container is the fastest way to get one for testing:
#   docker run --name clairmd-pg -e POSTGRES_PASSWORD=changeme \
#     -e POSTGRES_USER=clairmd_user -e POSTGRES_DB=clairmd_platform \
#     -p 5432:5432 -d postgres:16
npm run migrate                      # applies all 11 migrations in order
npm run dev                          # starts the server with auto-restart on changes
```

Then, in another terminal:

```bash
curl http://localhost:4000/health
# → {"status":"ok","env":"development","time":"..."}

curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"accountType":"individual_doctor","email":"test@example.com","password":"a-real-password-here","displayName":"Dr Test","licenseNumber":"TEST123"}'
# → {"account": {...}, "token": "..."}
```

Save the returned `token` and use it as `Authorization: Bearer <token>` on
everything else. If the signup call above returns a JSON response with an
`id`, the whole chain — Express routing, body parsing, zod validation,
bcrypt hashing, the database connection, and the migration — is genuinely
working end to end. That's the first real test to run.

Google OAuth (`/api/drive/oauth/start`) additionally needs a real Google
Cloud project with OAuth credentials — `GOOGLE_CLIENT_ID` /
`GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` in `.env` — before it does
anything beyond returning a 500.
