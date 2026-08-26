// Client for WHO's official ICD-API — entirely separate from BHTS
// (services/bhtsTerminology.js). Used for ICD-11 lookup, not ICD-10:
//
// - CONFIRMED, 26 August 2026 (Hansika live-checked CSNOFinder's full
//   reference-set list, scrolled to the end): BHTS's own SNOMED CT
//   service has no ICD-10 map reference set at all — nothing to build a
//   SNOMED-CT-to-ICD-10 crosswalk against.
// - CONFIRMED, 26 August 2026, from WHO's own published Swagger docs
//   (id.who.int/swagger/index.html): the ICD-API's ICD-10 section only
//   has structured browse-by-code endpoints (list releases, get a
//   category, get its children) — no free-text search. ICD-11 (both the
//   Foundation component and its "mms" linearization) does have a real
//   `/search` endpoint. So this integration searches ICD-11, not ICD-10.
// - Token exchange and the root entity call were confirmed directly from
//   WHO's own ICD-API-Samples/Python-samples/sample.py (real working
//   code, not just prose docs):
//     * token endpoint: POST https://icdaccessmanagement.who.int/connect/token
//       body (form-encoded): client_id, client_secret,
//       scope=icdapi_access, grant_type=client_credentials
//     * calls to id.who.int use header Authorization: Bearer <token>,
//       plus Accept: application/json, Accept-Language: en,
//       API-Version: v2. Tokens last about 1 hour.
// - The search endpoint and its parameters were confirmed from WHO's
//   Swagger UI (id.who.int/swagger/index.html), same day:
//     GET /icd/release/11/{releaseId}/{linearizationname}/search
//       ?q=...&medicalCodingMode=true&flatResults=true
//   `linearizationname` is "mms" (ICD-11's Mortality and Morbidity
//   Statistics linearization — the one with actual codes; the Foundation
//   component itself has none). `medicalCodingMode` (default true)
//   restricts results to entities that have a code, which is what we
//   want here. Response shape: `{ destinationEntities: [{ id, title,
//   theCode, ... }] }` — `id` is the entity's URI, `theCode` its ICD-11
//   code. Storing id+title+theCode together (not just the bare code)
//   isn't just convenient — the WHO ICD-11 License Agreement (Section
//   1.2.3) requires it wherever a Classification code is stored or
//   transmitted.
// - `releaseId` (e.g. "2019-04") is NOT hardcoded here — WHO cuts new
//   releases periodically, and a value confirmed live today would go
//   stale. Instead it's fetched from GET /icd/release/11/{linearization},
//   which lists available releases, and cached. UNVERIFIED: the exact
//   field name(s) that response uses to mark "the current one" — this
//   sandbox can't reach id.who.int at all to see a real response
//   (confirmed 26 August 2026, matching the same block on nrces.in seen
//   throughout this session). getCurrentMmsRelease() below reads this
//   defensively (a few plausible field names, falls back to the last
//   entry of a release list) rather than assuming one exact shape — same
//   approach as normalizeSnomedResults() took for BHTS's unconfirmed
//   response shape. Tighten this the first time a real response is
//   actually seen (i.e. once this runs on Render, which unlike this
//   sandbox can reach id.who.int).

const config = require("../config");

const TOKEN_URL = "https://icdaccessmanagement.who.int/connect/token";
const API_BASE = "https://id.who.int";
const LINEARIZATION = "mms";

let cachedToken = null; // { value, expiresAt }
let cachedRelease = null; // { value, cachedAt }
const RELEASE_CACHE_MS = 24 * 60 * 60 * 1000; // releases don't change intra-day

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }
  if (!config.whoIcd.clientId || !config.whoIcd.clientSecret) {
    throw new Error("WHO_ICD_CLIENT_ID / WHO_ICD_CLIENT_SECRET are not configured.");
  }
  const body = new URLSearchParams({
    client_id: config.whoIcd.clientId,
    client_secret: config.whoIcd.clientSecret,
    scope: "icdapi_access",
    grant_type: "client_credentials",
  });
  const res = await fetch(TOKEN_URL, { method: "POST", body });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`WHO ICD-API token request failed: ${res.status} ${res.statusText}${detail ? `: ${detail.slice(0, 300)}` : ""}`);
  }
  const data = await res.json();
  // Cache for a bit under the documented ~1 hour, so we refresh slightly
  // before WHO's own expiry rather than risk a request landing right on it.
  const ttlMs = (Number(data.expires_in) || 3600) * 1000 - 5 * 60 * 1000;
  cachedToken = { value: data.access_token, expiresAt: Date.now() + Math.max(ttlMs, 60 * 1000) };
  return cachedToken.value;
}

async function whoIcdGet(path, params, token) {
  const url = `${API_BASE}${path}${params ? `?${new URLSearchParams(params).toString()}` : ""}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Accept-Language": "en",
      "API-Version": "v2",
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`WHO ICD-API request failed: ${res.status} ${res.statusText}${detail ? `: ${detail.slice(0, 300)}` : ""} (${url})`);
  }
  return res.json();
}

// See this file's header comment — the exact response shape here is
// unverified from this sandbox. Reads a few plausible shapes rather than
// assuming one.
function extractReleaseId(release) {
  const candidateUris = [
    release?.latestRelease,
    Array.isArray(release?.release) ? release.release[release.release.length - 1] : null,
  ].filter(Boolean);
  for (const uri of candidateUris) {
    const match = String(uri).match(new RegExp(`/release/11/([^/]+)/${LINEARIZATION}\\b`));
    if (match) return match[1];
  }
  return null;
}

async function getCurrentMmsRelease(token) {
  if (cachedRelease && Date.now() - cachedRelease.cachedAt < RELEASE_CACHE_MS) {
    return cachedRelease.value;
  }
  const release = await whoIcdGet(`/icd/release/11/${LINEARIZATION}`, null, token);
  const releaseId = extractReleaseId(release);
  if (!releaseId) {
    throw new Error(
      "Couldn't determine the current ICD-11 MMS release id from WHO's response — its shape didn't match what was expected. " +
      "See services/whoIcd.js's header comment; this needs a real response captured to fix properly."
    );
  }
  cachedRelease = { value: releaseId, cachedAt: Date.now() };
  return releaseId;
}

// ICD-11 search for a diagnosis / condition name.
async function icd11Search(term, opts = {}) {
  const token = await getAccessToken();
  const releaseId = await getCurrentMmsRelease(token);
  const raw = await whoIcdGet(`/icd/release/11/${releaseId}/${LINEARIZATION}/search`, {
    q: term,
    medicalCodingMode: String(opts.medicalCodingMode ?? true),
    flatResults: String(opts.flatResults ?? true),
    highlightingEnabled: "false",
    useFlexisearch: String(opts.useFlexisearch ?? false),
  }, token);
  return raw;
}

module.exports = { icd11Search };
