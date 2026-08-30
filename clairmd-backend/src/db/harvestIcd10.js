// One-time (or occasional re-run) batch job: walks WHO's entire ICD-10
// tree and stores every code+title+URI into the local icd10_codes table
// (see migrations/026_icd10_codes.sql), so the app can search/lookup
// ICD-10 without needing live search from WHO's API (which doesn't have
// one for ICD-10 — see services/whoIcd.js's header comment for the full
// trail of what was checked before landing on this approach).
//
// Tree shape (confirmed live, 26 August 2026 — see whoIcd.js's
// getCurrentIcd10Release/icd10Probe comment for how): the release root's
// `child` array lists all 22 chapters as URIs; each node's own `child`
// array (when present) lists its children the same way, recursed until a
// node has none (a leaf code). `title` is `{"@language","@value"}`, not a
// plain string.
//
// Run with: npm run harvest-icd10 (see package.json). Takes a while —
// roughly 14,000-16,000 individual API calls, one per tree node, done
// sequentially with a small delay between each to stay well under
// whatever rate limit WHO enforces (unconfirmed, so deliberately
// conservative here rather than guessed at a faster pace and had to
// restart mid-crawl after getting throttled).
//
// SAFELY RESUMABLE (see migrations/027_icd10_harvest_progress.sql): a
// node's `harvest_complete` flag is only set once its ENTIRE subtree
// (itself + every descendant) has been stored. A node already marked
// complete is skipped outright — no WHO call, no recursion — so
// re-running this after an interruption (e.g. Render's free tier
// spinning the service down) only redoes the branch it was cut off on,
// not the whole tree.
//
// LICENSING (confirmed 28 August 2026, from WHO's own copyright page —
// who.int/about/policies/publishing/copyright, "Licensing of WHO
// Classifications" section — Hansika read it directly since this sandbox
// can't reach who.int): ICD, hosted on this same icd.who.int platform, is
// licensed CC BY-ND 3.0 IGO and "may be used for commercial and
// non-commercial purposes, provided there is no adaptation of the codes
// and the work is appropriately cited." Two conditions this harvester and
// its consumers must keep holding: (1) no adaptation — store/display
// WHO's codes and titles verbatim, exactly as harvested, never reworded
// or restructured; this job already does that by design, just don't let
// anything downstream "clean up" a title; (2) citation — every UI surface
// that shows ICD-10 results must credit WHO (see Icd10CodeSearch's
// citation line in ClairMDEHR.jsx). The full "ICD-11 Terms of Use and
// License Agreement" (linked from that same copyright page) is the
// authoritative document if any edge case beyond these two conditions
// comes up — worth a direct read before anything beyond straightforward
// display/embedding is built on this data (e.g. any transformation,
// re-export, or third-party redistribution).

const pool = require("./pool");
const { getAccessToken, whoIcdGet, getCurrentIcd10Release } = require("../services/whoIcd");

const DELAY_MS = 200; // ~5 req/sec — conservative; WHO's real limit is unconfirmed
const MAX_RETRIES = 4;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function codeFromUri(uri) {
  return String(uri).split("/").pop();
}

function titleText(title) {
  return title?.["@value"] || null;
}

async function fetchNodeWithRetry(releaseId, code, token) {
  let attempt = 0;
  for (;;) {
    try {
      return await whoIcdGet(`/icd/release/10/${releaseId}/${encodeURIComponent(code)}`, null, token);
    } catch (err) {
      attempt++;
      if (attempt > MAX_RETRIES) throw err;
      // Exponential backoff — a 429 (rate limited) or a transient network
      // blip both look the same from here, so back off for either.
      const backoffMs = DELAY_MS * 2 ** attempt;
      console.log(`  retrying ${code} (attempt ${attempt}/${MAX_RETRIES}) after ${err.message}`);
      await sleep(backoffMs);
    }
  }
}

async function isAlreadyComplete(code) {
  const result = await pool.query(`SELECT 1 FROM icd10_codes WHERE code = $1 AND harvest_complete`, [code]);
  return result.rows.length > 0;
}

async function upsertCode({ code, title, uri, chapter, parentCode }, complete) {
  await pool.query(
    `INSERT INTO icd10_codes (code, title, uri, chapter, parent_code, harvest_complete, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT (code) DO UPDATE SET title = $2, uri = $3, chapter = $4, parent_code = $5, harvest_complete = $6, updated_at = now()`,
    [code, title, uri, chapter, parentCode, complete]
  );
}

async function markComplete(code) {
  await pool.query(`UPDATE icd10_codes SET harvest_complete = true WHERE code = $1`, [code]);
}

async function harvestSubtree(releaseId, token, chapterCode, code, parentCode, counters) {
  if (await isAlreadyComplete(code)) {
    counters.resumedSkips++;
    return;
  }

  const node = await fetchNodeWithRetry(releaseId, code, token);
  await sleep(DELAY_MS);

  const title = titleText(node.title);
  if (title) {
    // Stored now, but not yet marked complete — its children (if any)
    // haven't been harvested yet. Complete is set after they are, below.
    await upsertCode({ code, title, uri: node["@id"], chapter: chapterCode, parentCode }, false);
    counters.stored++;
  } else {
    counters.skipped++;
    console.log(`  skipping ${code} — no title in response`);
  }

  if ((counters.stored + counters.skipped) % 50 === 0) {
    console.log(`  ...${counters.stored} stored, ${counters.skipped} skipped, ${counters.resumedSkips} already-done so far`);
  }

  const children = Array.isArray(node.child) ? node.child : [];
  for (const childUri of children) {
    const childCode = codeFromUri(childUri);
    await harvestSubtree(releaseId, token, chapterCode, childCode, code, counters);
  }

  if (title) await markComplete(code);
}

async function harvest() {
  console.log("Getting WHO ICD-API access token...");
  const token = await getAccessToken();

  console.log("Finding current ICD-10 release...");
  const releaseId = await getCurrentIcd10Release(token);
  console.log(`Using release ${releaseId}.`);

  console.log("Fetching the release root (22 chapters expected)...");
  const root = await whoIcdGet(`/icd/release/10/${releaseId}`, null, token);
  const chapterUris = Array.isArray(root.child) ? root.child : [];
  console.log(`Found ${chapterUris.length} chapters. Starting harvest — this will take a while.`);

  const counters = { stored: 0, skipped: 0, resumedSkips: 0 };
  for (const chapterUri of chapterUris) {
    const chapterCode = codeFromUri(chapterUri);
    console.log(`Chapter ${chapterCode}...`);
    await harvestSubtree(releaseId, token, chapterCode, chapterCode, null, counters);
  }

  console.log(`Done. ${counters.stored} codes stored, ${counters.skipped} skipped, ${counters.resumedSkips} already-done from a previous run.`);
}

module.exports = { harvest };

// Only run (and close the shared DB pool afterward) when executed directly
// as a script — e.g. `node src/db/harvestIcd10.js`. When imported instead
// (see routes/admin.js's /harvest-icd10, which triggers this from the
// already-running web server since Render's free tier has no Shell
// access), closing the pool here would kill the whole live app's
// database connection once the harvest finished.
if (require.main === module) {
  harvest()
    .catch((err) => {
      console.error("Harvest failed:", err.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
