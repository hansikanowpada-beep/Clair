-- ---------------------------------------------------------------------------
-- Tracks which icd10_codes subtrees have been FULLY harvested (the node
-- itself and all of its descendants), so db/harvestIcd10.js is safely
-- resumable. Render's free tier can spin a service down on inactivity —
-- a multi-hour crawl (~14,000-16,000 sequential WHO API calls) is a real
-- risk of getting cut off partway. Without this, re-running the harvest
-- after an interruption would re-fetch everything from scratch; with it,
-- any subtree already marked complete is skipped entirely (no WHO call),
-- so a restart only re-does the unfinished branch it was interrupted on.
-- ---------------------------------------------------------------------------

ALTER TABLE icd10_codes ADD COLUMN harvest_complete BOOLEAN NOT NULL DEFAULT false;
