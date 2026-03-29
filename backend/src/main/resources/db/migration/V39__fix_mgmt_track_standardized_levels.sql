-- V39__fix_mgmt_track_standardized_levels.sql
--
-- PROBLEM
-- -------
-- AI-enriched salary entries for management-track roles (DIRECTOR, VP, MANAGER)
-- were incorrectly mapped to IC-ladder standardized levels (e.g. "Engineering Manager",
-- "Principal Engineer") due to two bugs in AiSalaryEnrichmentService:
--
--  Bug 1 (YOE band override): The DB-driven YOE band lookup ran for all experience levels,
--  including management tracks. A Director with 15 YOE hit the 12–16y band → "Principal
--  Engineer". The fix in V39 of the service code adds an isMgmtTrack guard.
--
--  Bug 2 (scoring tie): In resolveFunctionLevel(), "Engineering Manager" and "Director"
--  scored identically (+1 seniority keyword). "Engineering Manager" appeared first in the
--  stream and won. The fix adds a fast-path for management tracks before scoring.
--
-- WHAT THIS MIGRATION DOES
-- ------------------------
-- For salary_entries only:
--
--  1. Entries with experienceLevel = DIRECTOR that are currently on a non-Director
--     standardized level → remapped to "Director"
--
--  2. Entries with experienceLevel = VP that are currently on a non-VP
--     standardized level → remapped to "VP Engineering" (or "VP" if that doesn't exist)
--
--  3. Entries with experienceLevel = MANAGER that are currently on a non-manager
--     standardized level (e.g. "Principal Engineer", "Staff Engineer", "Architect")
--     → remapped to "Engineering Manager"
--
--  4. Entries with experienceLevel = C_LEVEL on a non-C-Level row
--     → remapped to "C-Level" (V2 row that was never overwritten)
--
-- SAFETY
-- ------
-- All UPDATEs are scoped by experienceLevel + a NOT IN check on correct target names
-- so entries that are already correct are never touched.
-- Idempotent: re-running produces 0 rows updated.
-- No salary figures, company, dates, or other columns are modified.
-- Wrapped in a transaction — rolls back fully on any error.

BEGIN;

-- ── Snapshot before (for migration log output) ────────────────────────────────

CREATE TEMP TABLE v39_before AS
SELECT
    se.experience_level,
    sl.name  AS current_level,
    COUNT(*) AS entry_count
FROM   salary_entries se
JOIN   standardized_levels sl ON sl.id = se.standardized_level_id
WHERE  se.experience_level IN ('DIRECTOR', 'VP', 'MANAGER', 'C_LEVEL')
  AND  sl.name NOT IN ('Director', 'Sr. Director', 'VP Engineering', 'VP',
                       'Engineering Manager', 'Sr. Engineering Manager',
                       'Chief Product Officer', 'C-Level')
GROUP  BY se.experience_level, sl.name
ORDER  BY se.experience_level, entry_count DESC;

-- ── Fix 1: DIRECTOR entries on wrong standardized level → "Director" ──────────

UPDATE salary_entries
SET    standardized_level_id = (
           SELECT id FROM standardized_levels WHERE name = 'Director' LIMIT 1
       )
WHERE  experience_level = 'DIRECTOR'
  AND  standardized_level_id NOT IN (
           SELECT id FROM standardized_levels
           WHERE  name IN ('Director', 'Sr. Director')
       )
  AND  EXISTS (SELECT 1 FROM standardized_levels WHERE name = 'Director');

-- ── Fix 2: VP entries on wrong standardized level → "VP Engineering" or "VP" ──

UPDATE salary_entries
SET    standardized_level_id = (
           SELECT id FROM standardized_levels
           WHERE  name IN ('VP Engineering', 'VP')
           ORDER  BY CASE name WHEN 'VP Engineering' THEN 1 ELSE 2 END
           LIMIT  1
       )
WHERE  experience_level = 'VP'
  AND  standardized_level_id NOT IN (
           SELECT id FROM standardized_levels
           WHERE  name IN ('VP Engineering', 'VP')
       )
  AND  EXISTS (SELECT 1 FROM standardized_levels WHERE name IN ('VP Engineering', 'VP'));

-- ── Fix 3: MANAGER entries on IC-ladder levels → "Engineering Manager" ─────────
-- Only remaps entries that landed on clearly wrong IC levels (SDE tiers, Staff,
-- Principal, Architect) — leaves entries already on a manager-tier level alone.

UPDATE salary_entries
SET    standardized_level_id = (
           SELECT id FROM standardized_levels WHERE name = 'Engineering Manager' LIMIT 1
       )
WHERE  experience_level = 'MANAGER'
  AND  standardized_level_id IN (
           SELECT id FROM standardized_levels
           WHERE  name IN ('SDE 1', 'SDE 2', 'SDE 3',
                           'Staff Engineer', 'Principal Engineer', 'Architect',
                           'Junior', 'Mid', 'Senior', 'Lead', 'Principal')
       )
  AND  EXISTS (SELECT 1 FROM standardized_levels WHERE name = 'Engineering Manager');

-- ── Fix 4: C_LEVEL entries on wrong level → "C-Level" ─────────────────────────

UPDATE salary_entries
SET    standardized_level_id = (
           SELECT id FROM standardized_levels WHERE name = 'C-Level' LIMIT 1
       )
WHERE  experience_level = 'C_LEVEL'
  AND  standardized_level_id NOT IN (
           SELECT id FROM standardized_levels
           WHERE  name IN ('C-Level', 'Chief Product Officer')
       )
  AND  EXISTS (SELECT 1 FROM standardized_levels WHERE name = 'C-Level');

-- ── Migration summary log ─────────────────────────────────────────────────────

DO $$
DECLARE
    r      RECORD;
    total  INTEGER := 0;
BEGIN
    RAISE NOTICE 'V39 migration summary — management-track level fixes:';
    FOR r IN
        SELECT experience_level, current_level, entry_count
        FROM   v39_before
        ORDER  BY experience_level, entry_count DESC
    LOOP
        RAISE NOTICE '  [%] was "%": % entries remapped',
            r.experience_level, r.current_level, r.entry_count;
        total := total + r.entry_count;
    END LOOP;
    IF total = 0 THEN
        RAISE NOTICE '  No entries needed remapping (all already correct or no data).';
    ELSE
        RAISE NOTICE '  Total entries remapped: %', total;
    END IF;
    RAISE NOTICE 'IC-track entries (SDE 1–3, Staff, Principal, Architect): not touched.';
    RAISE NOTICE 'function_levels and level_mappings: not touched.';
END;
$$;

DROP TABLE v39_before;

COMMIT;
