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

async function upsertCode({ code, title, uri, chapter, parentCode }) {
  await pool.query(
    `INSERT INTO icd10_codes (code, title, uri, chapter, parent_code, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (code) DO UPDATE SET title = $2, uri = $3, chapter = $4, parent_code = $5, updated_at = now()`,
    [code, title, uri, chapter, parentCode]
  );
}

async function harvestSubtree(releaseId, token, chapterCode, code, parentCode, counters) {
  const node = await fetchNodeWithRetry(releaseId, code, token);
  await sleep(DELAY_MS);

  const title = titleText(node.title);
  if (title) {
    await upsertCode({ code, title, uri: node["@id"], chapter: chapterCode, parentCode });
    counters.stored++;
  } else {
    counters.skipped++;
    console.log(`  skipping ${code} — no title in response`);
  }

  if ((counters.stored + counters.skipped) % 50 === 0) {
    console.log(`  ...${counters.stored} stored, ${counters.skipped} skipped so far`);
  }

  const children = Array.isArray(node.child) ? node.child : [];
  for (const childUri of children) {
    const childCode = codeFromUri(childUri);
    await harvestSubtree(releaseId, token, chapterCode, childCode, code, counters);
  }
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

  const counters = { stored: 0, skipped: 0 };
  for (const chapterUri of chapterUris) {
    const chapterCode = codeFromUri(chapterUri);
    console.log(`Chapter ${chapterCode}...`);
    await harvestSubtree(releaseId, token, chapterCode, chapterCode, null, counters);
  }

  console.log(`Done. ${counters.stored} codes stored, ${counters.skipped} skipped.`);
}

harvest()
  .catch((err) => {
    console.error("Harvest failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
