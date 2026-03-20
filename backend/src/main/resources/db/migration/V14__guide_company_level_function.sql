-- V14__guide_company_level_function.sql
-- Guards the function_category column and index addition.
-- The column was introduced in V13 (seed migration) using IF NOT EXISTS.
-- This migration ensures the index exists even on databases that ran V13 before
-- the index statement was added, and is a no-op on fresh installs.

ALTER TABLE guide_company_levels
    ADD COLUMN IF NOT EXISTS function_category VARCHAR(50) DEFAULT 'Engineering';

CREATE INDEX IF NOT EXISTS idx_guide_co_level_function
    ON guide_company_levels(function_category);
