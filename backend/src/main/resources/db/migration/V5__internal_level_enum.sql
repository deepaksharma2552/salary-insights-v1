-- Migrate company_internal_level from free-text to standardized enum values
-- First normalize any existing data to match enum names

UPDATE salary_entries SET company_internal_level = 'SDE_1'
  WHERE LOWER(TRIM(company_internal_level)) IN ('sde 1','sde-1','sde1','l3','junior sde');

UPDATE salary_entries SET company_internal_level = 'SDE_2'
  WHERE LOWER(TRIM(company_internal_level)) IN ('sde 2','sde-2','sde2','l4','mid sde');

UPDATE salary_entries SET company_internal_level = 'SDE_3'
  WHERE LOWER(TRIM(company_internal_level)) IN ('sde 3','sde-3','sde3','sde-iii','l5','senior sde');

UPDATE salary_entries SET company_internal_level = 'STAFF_ENGINEER'
  WHERE LOWER(TRIM(company_internal_level)) IN ('staff engineer','staff','staff sde','l6');

UPDATE salary_entries SET company_internal_level = 'PRINCIPAL_ENGINEER'
  WHERE LOWER(TRIM(company_internal_level)) IN ('principal engineer','principal','principal sde','l7','ic5');

UPDATE salary_entries SET company_internal_level = 'ARCHITECT'
  WHERE LOWER(TRIM(company_internal_level)) IN ('architect','solution architect','software architect');

UPDATE salary_entries SET company_internal_level = 'ENGINEERING_MANAGER'
  WHERE LOWER(TRIM(company_internal_level)) IN ('engineering manager','eng manager','em','manager');

UPDATE salary_entries SET company_internal_level = 'SR_ENGINEERING_MANAGER'
  WHERE LOWER(TRIM(company_internal_level)) IN ('sr. engineering manager','senior engineering manager','senior em','sr em');

UPDATE salary_entries SET company_internal_level = 'DIRECTOR'
  WHERE LOWER(TRIM(company_internal_level)) IN ('director','director of engineering');

UPDATE salary_entries SET company_internal_level = 'SR_DIRECTOR'
  WHERE LOWER(TRIM(company_internal_level)) IN ('sr. director','senior director','sr director');

UPDATE salary_entries SET company_internal_level = 'VP'
  WHERE LOWER(TRIM(company_internal_level)) IN ('vp','vice president','vp engineering');

-- Null out anything that doesn't match a known value (unrecognized free text)
UPDATE salary_entries
  SET company_internal_level = NULL
  WHERE company_internal_level IS NOT NULL
    AND company_internal_level NOT IN (
      'SDE_1','SDE_2','SDE_3','STAFF_ENGINEER','PRINCIPAL_ENGINEER',
      'ARCHITECT','ENGINEERING_MANAGER','SR_ENGINEERING_MANAGER',
      'DIRECTOR','SR_DIRECTOR','VP'
    );

-- Resize column to match new max length
ALTER TABLE salary_entries
  ALTER COLUMN company_internal_level TYPE VARCHAR(50);
