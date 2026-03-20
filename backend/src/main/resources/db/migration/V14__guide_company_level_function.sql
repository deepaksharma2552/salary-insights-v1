-- V14__guide_company_level_function.sql
-- Add function_category column to guide_company_levels.
-- Allows filtering the Level Guide grid by job function (Engineering / Product / Program).
-- Nullable so existing rows are unaffected — backfilled by V13 seed update below.

ALTER TABLE guide_company_levels
    ADD COLUMN function_category VARCHAR(50) DEFAULT 'Engineering';

CREATE INDEX idx_guide_co_level_function ON guide_company_levels(function_category);
