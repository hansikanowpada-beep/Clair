// Proxies BHTS's CSNOServ (SNOMED CT) service to authenticated doctor
// accounts. See services/bhtsTerminology.js for what's confirmed about
// the underlying API and how. This route exists mainly so:
// (a) the frontend never needs BHTS's raw address baked into it — one
//     place to change if the hostname ever moves, and
// (b) our own rate limit sits in front of BHTS's public one, so one
//     doctor typing fast doesn't put us at risk of tripping it for
//     everyone else.

const express = require("express");
const rateLimit = require("express-rate-limit");
const { requireAuth } = require("../middleware/auth");
const { snomedSearch, snomedLookupConcept } = require("../services/bhtsTerminology");

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

module.exports = router;
