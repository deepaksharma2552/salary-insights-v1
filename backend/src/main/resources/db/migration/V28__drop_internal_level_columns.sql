-- V28__drop_internal_level_columns.sql
-- Run this AFTER V27 is deployed and you've verified:
--   SELECT COUNT(*) FROM salary_entries
--   WHERE company_internal_level IS NOT NULL AND standardized_level_id IS NULL;
--   → should return 0
--
-- Also verify function_levels:
--   SELECT COUNT(*) FROM function_levels
--   WHERE internal_level IS NOT NULL AND standardized_level_id IS NULL;
--   → should return 0

ALTER TABLE salary_entries  DROP COLUMN IF EXISTS company_internal_level;
ALTER TABLE function_levels DROP COLUMN IF EXISTS internal_level;
