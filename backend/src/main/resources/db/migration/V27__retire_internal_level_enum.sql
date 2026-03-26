-- V27__retire_internal_level_enum.sql
-- Retires the InternalLevel enum.
-- Strategy: standardized_levels becomes the single source of truth.
-- The old VARCHAR columns (company_internal_level, function_levels.internal_level)
-- are kept for this migration only — they are dropped in V28 once backfill is verified.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Ensure every InternalLevel enum value exists as a standardized_levels row.
--    hierarchy_rank uses 10-step gaps so admins can insert new levels in between
--    without renumbering everything.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO standardized_levels (id, name, hierarchy_rank, created_at)
VALUES
    (gen_random_uuid(), 'SDE 1',                   10,  NOW()),
    (gen_random_uuid(), 'SDE 2',                   20,  NOW()),
    (gen_random_uuid(), 'SDE 3',                   30,  NOW()),
    (gen_random_uuid(), 'Staff Engineer',           40,  NOW()),
    (gen_random_uuid(), 'Principal Engineer',       50,  NOW()),
    (gen_random_uuid(), 'Architect',                55,  NOW()),
    (gen_random_uuid(), 'Engineering Manager',      60,  NOW()),
    (gen_random_uuid(), 'Sr. Engineering Manager',  70,  NOW()),
    (gen_random_uuid(), 'Director',                 80,  NOW()),
    (gen_random_uuid(), 'Sr. Director',             90,  NOW()),
    (gen_random_uuid(), 'VP',                      100,  NOW())
ON CONFLICT (name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Add standardized_level_id FK to function_levels.
--    Nullable — not every level needs a mapping (e.g. non-Engineering functions).
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE function_levels
    ADD COLUMN IF NOT EXISTS standardized_level_id UUID
        REFERENCES standardized_levels(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Backfill function_levels.standardized_level_id from the old internal_level
--    VARCHAR column that V24 populated.
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE function_levels fl
SET    standardized_level_id = sl.id
FROM   standardized_levels sl
WHERE  sl.name = CASE fl.internal_level
                     WHEN 'SDE_1'                  THEN 'SDE 1'
                     WHEN 'SDE_2'                  THEN 'SDE 2'
                     WHEN 'SDE_3'                  THEN 'SDE 3'
                     WHEN 'STAFF_ENGINEER'          THEN 'Staff Engineer'
                     WHEN 'PRINCIPAL_ENGINEER'      THEN 'Principal Engineer'
                     WHEN 'ARCHITECT'               THEN 'Architect'
                     WHEN 'ENGINEERING_MANAGER'     THEN 'Engineering Manager'
                     WHEN 'SR_ENGINEERING_MANAGER'  THEN 'Sr. Engineering Manager'
                     WHEN 'DIRECTOR'                THEN 'Director'
                     WHEN 'SR_DIRECTOR'             THEN 'Sr. Director'
                     WHEN 'VP'                      THEN 'VP'
                 END
AND    fl.internal_level IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Backfill salary_entries.standardized_level_id from company_internal_level
--    for every row that has an enum value but no FK yet.
--    (salary_entries already has the standardized_level_id column from V1.)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE salary_entries se
SET    standardized_level_id = sl.id
FROM   standardized_levels sl
WHERE  sl.name = CASE se.company_internal_level
                     WHEN 'SDE_1'                  THEN 'SDE 1'
                     WHEN 'SDE_2'                  THEN 'SDE 2'
                     WHEN 'SDE_3'                  THEN 'SDE 3'
                     WHEN 'STAFF_ENGINEER'          THEN 'Staff Engineer'
                     WHEN 'PRINCIPAL_ENGINEER'      THEN 'Principal Engineer'
                     WHEN 'ARCHITECT'               THEN 'Architect'
                     WHEN 'ENGINEERING_MANAGER'     THEN 'Engineering Manager'
                     WHEN 'SR_ENGINEERING_MANAGER'  THEN 'Sr. Engineering Manager'
                     WHEN 'DIRECTOR'                THEN 'Director'
                     WHEN 'SR_DIRECTOR'             THEN 'Sr. Director'
                     WHEN 'VP'                      THEN 'VP'
                 END
AND    se.company_internal_level IS NOT NULL
AND    se.standardized_level_id  IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_salary_std_level
    ON salary_entries(standardized_level_id);

CREATE INDEX IF NOT EXISTS idx_function_level_std_level
    ON function_levels(standardized_level_id);
