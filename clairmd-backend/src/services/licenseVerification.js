// Medical license verification — pluggable provider pattern.
//
// RE-CHECKED 2026-08-22: this is the one item from a 5-item build list
// that genuinely could NOT be built the way the other four were (a
// hospital payment screen, a care-team view, doctor-initiated hospital
// affiliation, co-admin revocation/backup) — those were all buildable
// and independently testable from right here. This one isn't, for a
// reason specific to it: both nmc.org.in and www.nmc.org.in are blocked
// by this sandbox's network egress policy (confirmed directly — a real
// connection attempt and a WebFetch both came back as explicit policy
// denials, not transient failures), the same way api.razorpay.com was.
// Unlike Razorpay, though, there's no well-documented, stable base layer
// underneath this (like Razorpay's Orders/Checkout.js API) that's stable
// enough across the industry to implement with real confidence from
// training knowledge alone — NMC's actual search endpoint has never been
// an officially documented public API in the first place (see point 1
// below), and license-number FORMAT itself isn't standardized nationally
// (each of India's ~30 state medical councils sets its own), so even a
// format-only sanity check would be guessing. Implementing this for real
// needs either genuine internet access to NMC's endpoint (to observe its
// actual request/response shape before coding against it) or a signed
// relationship with a commercial verification vendor (a business
// decision — cost, contract, real account credentials — not something
// to set up unilaterally). Left as the honest, clearly-labeled stub
// below, same as it was after the original research.
//
// RESEARCHED OPTIONS (checked 2026-08-18, verify currency before relying
// on this — NMC's setup has been actively changing):
//
// 1. NMC's own public Indian Medical Register (IMR) search portal exists
//    at nmc.org.in/information-desk/indian-medical-register/ and is
//    genuinely searchable by registration number, name, year, or State
//    Medical Council — 1.4M+ doctors, the authoritative government
//    source. HOWEVER: the REST endpoints backing that search UI
//    (reverse-engineered by third parties as nmc.org.in/MCIRest/...) are
//    NOT an officially documented, supported public API — no published
//    contract, no stability guarantee, no rate-limit policy. Building
//    against it blind, without being able to test the actual request/
//    response shape live, risks silently getting it wrong in a way that
//    either wrongly rejects real doctors or wrongly accepts bad license
//    numbers — worse than leaving this as an honest stub. NOT
//    implemented here for that reason.
// 2. NMC also launched a newer National Medical Register (NMR), which
//    will eventually replace the IMR and is Aadhaar-linked — as of this
//    research it was still in active rollout, not a stable target either.
// 3. Commercial verification APIs exist (e.g. Surepass, Meon) that wrap
//    NMC data with an actual documented, supported contract and SLA —
//    the more production-realistic path if reliability matters more than
//    cost, but their exact request/response shapes weren't independently
//    verified here either — read their current docs before integrating,
//    don't assume this file's shape matches them.
//
// What IS built: a clean provider interface, so wiring in a real
// verification source later is a small, isolated change — implement
// `verify()` for whichever provider is chosen and set LICENSE_VERIFICATION_
// PROVIDER, nothing else in the app needs to change.

const config = require("../config");

// Providers register themselves here. Each must implement:
//   async verify(licenseNumber) -> { verified: boolean, details?: object }
const providers = {};

providers.devAcceptAny = {
  async verify(licenseNumber) {
    // Never used outside development — see the guard in verifyMedicalLicense().
    return { verified: Boolean(licenseNumber && licenseNumber.trim().length > 0) };
  },
};

// Placeholder shape for a real provider — intentionally throws rather
// than silently returning a fake "verified: true". Fill in a real HTTP
// call here once a provider (commercial API, or a properly tested NMC
// integration) is actually chosen and its contract confirmed.
providers.unconfigured = {
  async verify() {
    throw new Error(
      "No real license verification provider is configured. Set " +
      "LICENSE_VERIFICATION_PROVIDER and implement it in " +
      "services/licenseVerification.js before allowing doctor signups in production."
    );
  },
};

async function verifyMedicalLicense(licenseNumber) {
  if (config.nodeEnv === "development") {
    return (await providers.devAcceptAny.verify(licenseNumber)).verified;
  }
  const providerName = config.licenseVerificationProvider;
  const provider = providers[providerName] || providers.unconfigured;
  const result = await provider.verify(licenseNumber);
  return result.verified;
}

module.exports = { verifyMedicalLicense, providers };
