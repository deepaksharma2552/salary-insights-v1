-- V37__remap_generic_levels_to_sde_tiers.sql
--
-- PROBLEM
-- -------
-- standardized_levels contains two naming conventions that were seeded at different times:
--
--   V2 (original seed):  Intern(1), Junior(2), Mid(3), Senior(4), Lead(5),
--                        Principal(6), Manager(7), Director(8), VP(9), C-Level(10)
--
--   V27 (enum migration): SDE 1(10), SDE 2(20), SDE 3(30), Staff Engineer(40),
--                         Principal Engineer(50), Architect(55),
--                         Engineering Manager(60), Sr. Engineering Manager(70),
--                         Director(80*), Sr. Director(90), VP(100*)
--                         (* ON CONFLICT DO NOTHING — V2 rows were kept)
--
-- The AI enrichment fallback path wrote SDE-tier names onto some entries while
-- the FunctionLevel → standardizedLevel propagation path wrote generic names onto
-- others. Both coexist as separate standardized_level_id values, causing duplicate
-- level rows in analytics charts.
--
-- WHAT THIS MIGRATION DOES
-- ------------------------
-- For salary_entries only: remaps the four ambiguous generic-name rows
-- (Junior, Mid, Senior, Lead, Principal, Manager) to their SDE-tier equivalents.
--
-- Director and VP are intentionally left alone — they exist only in V2
-- (V27's inserts were skipped by ON CONFLICT) so there is a single consistent row;
-- no remapping is needed.
--
-- Intern and C-Level are left alone — no SDE-tier equivalent exists for them.
--
-- function_levels.standardized_level_id is NOT touched — those are admin-managed
-- and will show the ⚠ "no bands" warning in the UI until the admin reconfigures them.
--
-- level_mappings is NOT touched — it maps company_levels to standardized_levels for
-- the Level Guide feature, which is separate from salary analytics.
--
-- SAFETY
-- ------
-- Every UPDATE is scoped by a subquery on standardized_levels.name so the migration
-- self-heals if a row doesn't exist (0 rows updated, no error).
-- The migration is idempotent: re-running after all entries are already on SDE-tier
-- rows produces 0 rows updated each time.
-- No salary figures, company associations, dates, or any other columns are modified.

BEGIN;

-- ── Step 1: Snapshot counts before (stored in a temp table for the final report) ──

CREATE TEMP TABLE v37_before AS
SELECT sl.name, COUNT(se.id) AS entry_count
FROM   salary_entries se
JOIN   standardized_levels sl ON sl.id = se.standardized_level_id
WHERE  sl.name IN ('Junior', 'Mid', 'Senior', 'Lead', 'Principal', 'Manager')
GROUP  BY sl.name;

-- ── Step 2: Remap Junior → SDE 1 ──────────────────────────────────────────────

UPDATE salary_entries
SET    standardized_level_id = (
           SELECT id FROM standardized_levels WHERE name = 'SDE 1' LIMIT 1
       )
WHERE  standardized_level_id = (
           SELECT id FROM standardized_levels WHERE name = 'Junior' LIMIT 1
       )
  AND  EXISTS (SELECT 1 FROM standardized_levels WHERE name = 'SDE 1');

-- ── Step 3: Remap Mid → SDE 2 ─────────────────────────────────────────────────

UPDATE salary_entries
SET    standardized_level_id = (
           SELECT id FROM standardized_levels WHERE name = 'SDE 2' LIMIT 1
       )
WHERE  standardized_level_id = (
           SELECT id FROM standardized_levels WHERE name = 'Mid' LIMIT 1
       )
  AND  EXISTS (SELECT 1 FROM standardized_levels WHERE name = 'SDE 2');

-- ── Step 4: Remap Senior → SDE 3 ──────────────────────────────────────────────

UPDATE salary_entries
SET    standardized_level_id = (
           SELECT id FROM standardized_levels WHERE name = 'SDE 3' LIMIT 1
       )
WHERE  standardized_level_id = (
           SELECT id FROM standardized_levels WHERE name = 'Senior' LIMIT 1
       )
  AND  EXISTS (SELECT 1 FROM standardized_levels WHERE name = 'SDE 3');

-- ── Step 5: Remap Lead → Staff Engineer ───────────────────────────────────────

UPDATE salary_entries
SET    standardized_level_id = (
           SELECT id FROM standardized_levels WHERE name = 'Staff Engineer' LIMIT 1
       )
WHERE  standardized_level_id = (
           SELECT id FROM standardized_levels WHERE name = 'Lead' LIMIT 1
       )
  AND  EXISTS (SELECT 1 FROM standardized_levels WHERE name = 'Staff Engineer');

-- ── Step 6: Remap Principal → Principal Engineer ───────────────────────────────

UPDATE salary_entries
SET    standardized_level_id = (
           SELECT id FROM standardized_levels WHERE name = 'Principal Engineer' LIMIT 1
       )
WHERE  standardized_level_id = (
           SELECT id FROM standardized_levels WHERE name = 'Principal' LIMIT 1
       )
  AND  EXISTS (SELECT 1 FROM standardized_levels WHERE name = 'Principal Engineer');

-- ── Step 7: Remap Manager → Engineering Manager ────────────────────────────────

UPDATE salary_entries
SET    standardized_level_id = (
           SELECT id FROM standardized_levels WHERE name = 'Engineering Manager' LIMIT 1
       )
WHERE  standardized_level_id = (
           SELECT id FROM standardized_levels WHERE name = 'Manager' LIMIT 1
       )
  AND  EXISTS (SELECT 1 FROM standardized_levels WHERE name = 'Engineering Manager');

-- ── Step 8: Log what was changed (visible in Flyway output / migration logs) ───

DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE 'V37 migration summary — salary_entries remapped:';
    FOR r IN
        SELECT name, entry_count FROM v37_before ORDER BY entry_count DESC
    LOOP
        RAISE NOTICE '  %-12s → %s entries remapped', r.name, r.entry_count;
    END LOOP;
    RAISE NOTICE 'Director, VP, Intern, C-Level: intentionally left unchanged.';
    RAISE NOTICE 'function_levels and level_mappings: not touched.';
END;
$$;

DROP TABLE v37_before;

COMMIT;
