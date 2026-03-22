-- V24__function_level_internal_mapping.sql
-- Adds an optional internal_level mapping to function_levels.
-- Allows admin to explicitly map e.g. "SDE 1" (Engineering) → SDE_1 (InternalLevel enum).
-- Used by SalaryService on submission to set company_internal_level without name-matching hacks.

ALTER TABLE function_levels
    ADD COLUMN IF NOT EXISTS internal_level VARCHAR(50);

-- Backfill Engineering levels — these match 1:1 with InternalLevel enum values
UPDATE function_levels fl
SET internal_level = CASE fl.name
    WHEN 'SDE 1'                  THEN 'SDE_1'
    WHEN 'SDE 2'                  THEN 'SDE_2'
    WHEN 'SDE 3'                  THEN 'SDE_3'
    WHEN 'Staff Engineer'         THEN 'STAFF_ENGINEER'
    WHEN 'Principal Engineer'     THEN 'PRINCIPAL_ENGINEER'
    WHEN 'Architect'              THEN 'ARCHITECT'
    WHEN 'Engineering Manager'    THEN 'ENGINEERING_MANAGER'
    WHEN 'Sr. Engineering Manager' THEN 'SR_ENGINEERING_MANAGER'
    WHEN 'Director'               THEN 'DIRECTOR'
    WHEN 'Sr. Director'           THEN 'SR_DIRECTOR'
    WHEN 'VP'                     THEN 'VP'
    ELSE NULL
END
WHERE EXISTS (
    SELECT 1 FROM job_functions jf
    WHERE jf.id = fl.job_function_id
      AND jf.name = 'ENGINEERING'
);
