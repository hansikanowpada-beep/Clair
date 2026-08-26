// Client for CSNOServ (SNOMED CT) and LOINCServ (LOINC) — the two REST
// services behind India's Bharat Health Terminology Service (BHTS),
// launched June 2026 by MoHFW/NRCeS at C-DAC Pune. BHTS's own FAQ states
// these APIs are publicly available with rate limits and need no
// registration — unlike WHO's ICD-API or the SNOMED International
// Affiliate license, which both need a signed agreement.
//
// NOT YET CONFIGURED WITH A REAL BASE URL. What's confirmed vs. not:
//
// - CONFIRMED (from NRCeS's own indexed CSNOServ documentation, found
//   25 August 2026): the REST path shape for two SNOMED CT operations —
//   `/csnoserv/api/search/search?term=...&state=...&acceptability=...&refsetid=...`
//   and `/csnoserv/api/search/suggest?...` (same query params). This
//   file implements exactly those two, nothing more.
// - CONFIRMED to exist, but exact REST paths NOT confirmed: `lookup`,
//   `explore`, `map` (SNOMED CT -> ICD-10 and -> LOINC — directly useful
//   for tagging conditions once wired up), and `validate`. Do not guess
//   their paths — add them here once actually observed (see below).
// - NOT CONFIRMED: BHTS's actual public hostname. CSNOServ is
//   fundamentally a downloadable WAR file — the documentation examples
//   all show `localhost:8080/csnoserv/...`, which is the self-hosted
//   pattern, not necessarily what NRCeS runs publicly. This environment's
//   network egress blocks nrces.in directly, so it can't be observed
//   from here.
// - LOINCServ (LOINC): no endpoint paths confirmed at all yet. Nothing
//   implemented for it here — add functions once paths are known, same
//   pattern as below.
//
// HOW TO FINISH THIS: open BHTS's live Aarogyawali or CSNOFinder search
// tool in a browser, open DevTools -> Network tab, type a search term,
// and read the actual outgoing request URL off a real call — that's
// more reliable than hunting for a docs page, and gives both the real
// hostname and confirmation of the paths above (or corrections to them).
// Set BHTS_BASE_URL in .env to that hostname (e.g.
// `https://<real-host>` with no trailing slash) once known.

const config = require("../config");

class BhtsNotConfiguredError extends Error {
  constructor() {
    super(
      "BHTS_BASE_URL is not set. Get the real CSNOServ/LOINCServ hostname " +
      "by inspecting a live request on BHTS's Aarogyawali or CSNOFinder " +
      "tool (browser DevTools -> Network tab), then set BHTS_BASE_URL in .env."
    );
    this.name = "BhtsNotConfiguredError";
  }
}

function requireBaseUrl() {
  if (!config.bhtsBaseUrl) throw new BhtsNotConfiguredError();
  return config.bhtsBaseUrl.replace(/\/+$/, "");
}

async function csnoRequest(operation, term, opts = {}) {
  const base = requireBaseUrl();
  const params = new URLSearchParams({
    term,
    state: opts.state || "active",
    acceptability: opts.acceptability || "preferred",
  });
  if (opts.refsetId) params.set("refsetid", opts.refsetId);

  const url = `${base}/csnoserv/api/search/${operation}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`CSNOServ ${operation} request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// Autocomplete-style suggestions for a partial SNOMED CT term.
async function snomedSuggest(term, opts = {}) {
  return csnoRequest("suggest", term, opts);
}

// Full SNOMED CT search for a term.
async function snomedSearch(term, opts = {}) {
  return csnoRequest("search", term, opts);
}

module.exports = { snomedSuggest, snomedSearch, BhtsNotConfiguredError };
