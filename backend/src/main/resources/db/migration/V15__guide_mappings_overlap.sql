-- V15__guide_mappings_overlap.sql
-- Upgrades guide_mappings from 1:1 to 1:many with overlap percentages.
-- A company level can now map to multiple standard levels.
-- Each mapping row carries an overlap_pct (1–100) representing what share of
-- the company level sits at that standard level. Percentages across all rows
-- for the same company level should sum to 100 (enforced by the service layer).

-- Drop the UNIQUE constraint that enforced 1:1
ALTER TABLE guide_mappings
    DROP CONSTRAINT IF EXISTS guide_mappings_guide_company_level_id_key;

-- Add overlap_pct — defaults to 100 so all existing rows remain valid
ALTER TABLE guide_mappings
    ADD COLUMN IF NOT EXISTS overlap_pct INTEGER NOT NULL DEFAULT 100;

-- Composite unique: one company level cannot map to the same standard level twice
ALTER TABLE guide_mappings
    ADD CONSTRAINT uq_guide_mapping_co_std
    UNIQUE (guide_company_level_id, guide_standard_level_id);

-- Update index to cover the new query pattern
CREATE INDEX IF NOT EXISTS idx_guide_mapping_co_level
    ON guide_mappings(guide_company_level_id);
