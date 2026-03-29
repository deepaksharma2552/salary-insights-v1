-- V41__link_intern_function_levels_to_standardized_level.sql
--
-- PROBLEM
-- -------
-- V36 added 'Intern' rows to function_levels for Engineering, Product and Design,
-- but did NOT set standardized_level_id on them (the column was added in V27).
--
-- In AiSalaryEnrichmentService the YOE-band lookup filters out any FunctionLevel
-- where fl.getStandardizedLevel() == null (line ~864):
--
--     .filter(fl -> fl.getMinYoe() != null && fl.getMaxYoe() != null
--                   && fl.getStandardizedLevel() != null)
--
-- So Intern entries submitted via the AI enrichment path have standardized_level_id
-- left NULL on the salary_entry row.  Because every analytics query does:
--
--     JOIN standardized_levels sl ON sl.id = s.standardized_level_id
--
-- those entries are silently excluded from all charts — Intern never appears.
--
-- WHAT THIS MIGRATION DOES
-- ------------------------
-- Sets standardized_level_id on every function_levels row named 'Intern' that
-- currently has it NULL, pointing it at the standardized_levels row named 'Intern'
-- (seeded in V2, rank fixed to 5 in V38).
--
-- Also backfills existing salary_entries that were left with a NULL
-- standardized_level_id AND have experience_level = 'INTERN', so historical
-- submissions become visible in analytics immediately without waiting for
-- re-enrichment.
--
-- SAFETY
-- ------
-- Both UPDATEs are guarded by existence checks and NULL guards — idempotent,
-- re-running produces 0 rows updated.
-- No salary figures, company associations, dates, or other columns are modified.

-- ── 1. Link Intern function_levels rows to the standardized_level 'Intern' ────

UPDATE function_levels
SET    standardized_level_id = (
           SELECT id FROM standardized_levels WHERE name = 'Intern' LIMIT 1
       )
WHERE  name = 'Intern'
  AND  standardized_level_id IS NULL
  AND  EXISTS (SELECT 1 FROM standardized_levels WHERE name = 'Intern');

-- ── 2. Backfill existing salary_entries with NULL standardized_level_id ────────
--       Scope: only INTERN experience_level rows, so we don't touch legitimate
--       NULLs from other functions that may not have YOE bands configured yet.

UPDATE salary_entries
SET    standardized_level_id = (
           SELECT id FROM standardized_levels WHERE name = 'Intern' LIMIT 1
       )
WHERE  experience_level = 'INTERN'
  AND  standardized_level_id IS NULL
  AND  EXISTS (SELECT 1 FROM standardized_levels WHERE name = 'Intern');
