// Proxies BHTS's CSNOServ (SNOMED CT) and LOINCServ (LOINC lab codes)
// services to authenticated doctor accounts. See
// services/bhtsTerminology.js for what's confirmed about each underlying
// API and how. This route exists mainly so:
// (a) the frontend never needs BHTS's raw address baked into it — one
//     place to change if the hostname ever moves, and
// (b) our own rate limit sits in front of BHTS's public one, so one
//     doctor typing fast doesn't put us at risk of tripping it for
//     everyone else.

const express = require("express");
const rateLimit = require("express-rate-limit");
const { requireAuth } = require("../middleware/auth");
const { snomedSearch, snomedLookupConcept, loincSearch } = require("../services/bhtsTerminology");
const pool = require("../db/pool");

const router = express.Router();

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many terminology searches — please slow down." },
});

router.get("/snomed/search", requireAuth, searchLimiter, async (req, res) => {
  const term = (req.query.term || "").trim();
  if (term.length < 3) {
    return res.status(400).json({ error: "term must be at least 3 characters." });
  }
  try {
    const result = await snomedSearch(term, { returnLimit: 15 });
    res.json(result);
  } catch (err) {
    // BHTS being unreachable/slow is an upstream issue, not a bug in this
    // server — 502 (bad gateway) says that honestly instead of a bare 500.
    res.status(502).json({ error: `Couldn't reach BHTS's SNOMED CT service: ${err.message}` });
  }
});

router.get("/snomed/concept/:id", requireAuth, searchLimiter, async (req, res) => {
  try {
    const result = await snomedLookupConcept(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: `Couldn't reach BHTS's SNOMED CT service: ${err.message}` });
  }
});

router.get("/loinc/search", requireAuth, searchLimiter, async (req, res) => {
  const text = (req.query.text || "").trim();
  if (text.length < 3) {
    return res.status(400).json({ error: "text must be at least 3 characters." });
  }
  try {
    const result = await loincSearch(text);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: `Couldn't reach BHTS's LOINC service: ${err.message}` });
  }
});

// ICD-10 — searched against our own local copy of WHO's data (see
// db/harvestIcd10.js), not a live WHO call: WHO's API itself has no
// free-text search for ICD-10, only structured browse-by-code (see
// services/whoIcd.js's header comment). Two separate small endpoints
// rather than one, matching the app's two-search-bar design (by number,
// by name) since they're different query shapes against the same table.

router.get("/icd10/search", requireAuth, searchLimiter, async (req, res) => {
  const text = (req.query.text || "").trim();
  if (text.length < 3) {
    return res.status(400).json({ error: "text must be at least 3 characters." });
  }
  try {
    const result = await pool.query(
      `SELECT code, title, uri FROM icd10_codes WHERE title ILIKE '%' || $1 || '%' ORDER BY title LIMIT 20`,
      [text]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(502).json({ error: `ICD-10 search failed: ${err.message}` });
  }
});

router.get("/icd10/code/:code", requireAuth, searchLimiter, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT code, title, uri FROM icd10_codes WHERE code = $1`,
      [req.params.code.trim().toUpperCase()]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: `"${req.params.code}" isn't a known ICD-10 code.` });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(502).json({ error: `ICD-10 lookup failed: ${err.message}` });
  }
});

module.exports = router;
