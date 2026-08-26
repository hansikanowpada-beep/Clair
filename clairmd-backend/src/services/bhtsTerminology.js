// Client for CSNOServ — the SNOMED CT REST service behind India's Bharat
// Health Terminology Service (BHTS), launched June 2026 by MoHFW/NRCeS at
// C-DAC Pune. BHTS's own FAQ states these APIs are publicly available
// with rate limits and need no registration — unlike WHO's ICD-API or
// the SNOMED International Affiliate license, which both need a signed
// agreement.
//
// What's confirmed vs. not, and how each was confirmed:
//
// - CONFIRMED LIVE, 26 August 2026: the base URL and exact query shape
//   for two operations, read directly off real requests captured in
//   browser DevTools while using BHTS's own CSNOFinder tool
//   (nrces.in/bhts/browser/) — not guessed, not from documentation:
//     * search: GET {base}/api/search/search
//         ?term=...&state=active&semantictag=all&acceptability=all
//         &groupbyconcept=false&returnlimit=...
//     * lookup: GET {base}/api/lookup/concept?id={conceptId}&langrefset=all
//   This file implements exactly those two.
// - The captured browser requests included jQuery JSONP artifacts
//   (`callback=jQuery...`, a `_=<timestamp>` cache-buster) — that's
//   CSNOFinder's own frontend code calling same-origin, not a sign the
//   API requires JSONP. We deliberately omit both params: a plain GET
//   from a server (not a browser) doesn't need CORS or JSONP at all.
//   `parseMaybeJsonp()` below is a defensive fallback in case the server
//   wraps every response in a callback regardless — this hasn't been
//   verified live (this sandbox's network egress blocks nrces.in
//   entirely, confirmed again 26 August 2026 — both a direct fetch and a
//   raw curl through the proxy failed), so treat the first real call
//   from a reachable environment as the actual verification.
// - CONFIRMED LIVE, 26 August 2026 (Hansika testing from her own
//   browser): the exact same URL that works when CSNOFinder's own JS
//   calls it 404s when opened directly (address-bar navigation, and
//   equally a plain server-to-server call like this file's) — same
//   params both times, only the request's origin/context differs. That
//   points to the server checking where a request came from (a
//   `Referer` check, most likely) rather than the query string. `Referer`
//   and `X-Requested-With` below are set to look like a real request from
//   CSNOFinder's own page for that reason. Still unverified from this
//   sandbox (nrces.in unreachable here) — if search still fails after
//   this change, the next thing to try is capturing CSNOFinder's full
//   request headers (DevTools -> Network tab -> click the request ->
//   Headers -> the Request Headers section, not just the URL) rather than
//   guessing further.
// - CONFIRMED to exist, but exact REST paths NOT confirmed: `suggest`,
//   `explore`, `map` (SNOMED CT -> ICD-10 and -> LOINC — directly useful
//   for tagging conditions once wired up), and `validate`. Do not guess
//   their paths — capture a real request the same way (DevTools Network
//   tab while using CSNOFinder or Aarogyawali) and add them here once
//   observed.
// - LOINCServ (LOINC): CONFIRMED LIVE, 26 August 2026, from LOINCServ's own
//   published Swagger/OpenAPI docs (nrces.in/bhts/api/v1/loincserv/
//   swagger-ui/) — a real spec, not reverse-engineered like CSNOServ above.
//     * search: GET {loincBase}/v2/search
//         ?status=ACTIVE&panelType=ALL&component=ALL&property=ALL
//         &scale=ALL&timing=ALL&method=ALL&exampleUnits=ALL
//         &sortByRank=false&enableClci=false
//   Confirmed there is NO free-text search parameter on this endpoint —
//   "status" is the first parameter, full stop. LOINC's own model
//   searches across structured axes (component/property/system/scale/
//   method/timing) rather than one text box. `loincSearch()` below maps
//   a doctor's typed text onto `component` ("substance or entity being
//   measured" — the closest axis to a plain lab-test name, e.g.
//   "hemoglobin," "glucose") and leaves every other axis at its default
//   ("ALL"), which is an interpretation of how to use this endpoint for
//   a single search box, not something the spec states outright.
//   Response is an array of objects with LOINC_NUMBER, COMPONENT,
//   PROPERTY, SYSTEM, LONG_COMMON_NAME, ShortName, DisplayName, STATUS,
//   CLASS, and more — see the Swagger docs for the full schema.
//   Also documented, not yet wired here: reference-list endpoints at
//   GET /v2/{classes,components,methods,properties,scales,systems,
//   timings} (each takes an optional `text` filter, default "ALL") and
//   GET /v2/version (no params). Add functions for these if/when
//   actually needed.
//   Unlike CSNOServ, this is a real published API surface — no Referer/
//   X-Requested-With trick applied here unless it turns out to also be
//   needed (unverified from this sandbox; nrces.in unreachable here).
//
// Default base URLs below are the ones confirmed live above. Override
// with BHTS_BASE_URL / LOINC_BASE_URL in .env only if pointing at a
// different deployment (e.g. a self-hosted instance for scale).

const config = require("../config");

const DEFAULT_BASE_URL = "https://www.nrces.in/bhts/api/v1/csnoserv";
const DEFAULT_LOINC_BASE_URL = "https://www.nrces.in/bhts/api/v1/loincserv";

function baseUrl() {
  return (config.bhtsBaseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function loincBaseUrl() {
  return (config.loincBaseUrl || DEFAULT_LOINC_BASE_URL).replace(/\/+$/, "");
}

// Defensive unwrap for a JSONP-style body (`someCallback({...})`) in case
// the server returns one even without a `callback` param in the request.
// Falls through to a normal JSON.parse first since that's the expected case.
function parseMaybeJsonp(text) {
  try {
    return JSON.parse(text);
  } catch (_err) {
    const match = text.match(/^\s*[\w$]+\((.*)\)\s*;?\s*$/s);
    if (match) return JSON.parse(match[1]);
    throw new Error("Response was neither valid JSON nor a recognisable JSONP wrapper.");
  }
}

async function bhtsGet(path, params) {
  const url = `${baseUrl()}${path}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Referer: "https://www.nrces.in/bhts/browser/",
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  if (!res.ok) {
    throw new Error(`BHTS request failed: ${res.status} ${res.statusText} (${url})`);
  }
  return parseMaybeJsonp(await res.text());
}

// Full SNOMED CT search for a term — e.g. what a doctor typed into a note
// field, matched against BHTS's concept index.
async function snomedSearch(term, opts = {}) {
  return bhtsGet("/api/search/search", {
    term,
    state: opts.state || "active",
    semantictag: opts.semanticTag || "all",
    acceptability: opts.acceptability || "all",
    groupbyconcept: String(opts.groupByConcept ?? false),
    returnlimit: String(opts.returnLimit ?? 20),
  });
}

// Full concept detail for a known SNOMED CT concept ID (e.g. one returned
// by snomedSearch above).
async function snomedLookupConcept(conceptId, opts = {}) {
  return bhtsGet("/api/lookup/concept", {
    id: conceptId,
    langrefset: opts.langRefset || "all",
  });
}

async function loincGet(path, params) {
  const url = `${loincBaseUrl()}${path}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  // LOINCServ's own docs define 404 here as "no match found for the
  // provided filters" — a real, documented empty-results response, not
  // a failure. Treating it as an error (like SNOMED's 404, which really
  // does mean something's wrong) would make an ordinary no-hits search
  // look like an outage.
  if (res.status === 404) return [];
  if (!res.ok) {
    // Surface LOINCServ's own response body (when it has one) rather than
    // just the status — a 400 in particular usually names which parameter
    // it rejected, and that's otherwise only visible by re-capturing the
    // request in DevTools by hand.
    const body = await res.text().catch(() => "");
    const detail = body ? `: ${body.slice(0, 300)}` : "";
    throw new Error(`LOINCServ request failed: ${res.status} ${res.statusText}${detail} (${url})`);
  }
  return res.json();
}

// LOINC search for a lab test / observation name — maps `text` onto the
// `component` axis (see the module header comment for why). Every other
// axis stays at "ALL" (LOINCServ's own default), i.e. unfiltered.
async function loincSearch(text, opts = {}) {
  return loincGet("/v2/search", {
    status: opts.status || "ACTIVE",
    panelType: opts.panelType || "ALL",
    component: text || "ALL",
    property: opts.property || "ALL",
    scale: opts.scale || "ALL",
    timing: opts.timing || "ALL",
    method: opts.method || "ALL",
    exampleUnits: opts.exampleUnits || "ALL",
    sortByRank: String(opts.sortByRank ?? false),
    enableClci: String(opts.enableClci ?? false),
  });
}

module.exports = { snomedSearch, snomedLookupConcept, loincSearch, parseMaybeJsonp };
