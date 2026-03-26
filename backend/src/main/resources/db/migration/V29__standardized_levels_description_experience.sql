-- V29__standardized_levels_description_experience.sql
-- Adds description and experience_level to standardized_levels.
-- description: mirrors guide_standard_levels.description — shown in admin UI.
-- experience_level: explicit tier, replaces the old deriveFromRank() rank-ladder in SalaryService.

ALTER TABLE standardized_levels
    ADD COLUMN IF NOT EXISTS description    VARCHAR(500),
    ADD COLUMN IF NOT EXISTS experience_level VARCHAR(20);

-- Backfill experience_level from hierarchy_rank for the 11 rows seeded in V27.
-- Ranges match the old deriveFromRank() ladder exactly so no salary entries change tier.
UPDATE standardized_levels
SET experience_level = CASE
    WHEN hierarchy_rank <= 10  THEN 'ENTRY'    -- SDE 1
    WHEN hierarchy_rank <= 20  THEN 'MID'      -- SDE 2
    WHEN hierarchy_rank <= 30  THEN 'SENIOR'   -- SDE 3
    WHEN hierarchy_rank <= 55  THEN 'LEAD'     -- Staff / Principal / Architect
    WHEN hierarchy_rank <= 70  THEN 'MANAGER'  -- EM / Sr EM
    WHEN hierarchy_rank <= 90  THEN 'DIRECTOR' -- Director / Sr. Director
    ELSE                             'VP'
END
WHERE experience_level IS NULL;
