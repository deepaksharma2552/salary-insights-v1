-- V11__guide_levels.sql
-- Level Guide feature — completely separate from salary-analytics level tables.
-- Stores admin-managed level equivalency data for the public Level Guide view.

-- Universal benchmark ladder (admin-defined, e.g. "Junior Engineer", "Senior Engineer")
CREATE TABLE guide_standard_levels (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    rank        INTEGER      NOT NULL,          -- ordering: lower = more junior
    description VARCHAR(500),                   -- optional: scope/responsibility hint
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP
);

CREATE INDEX idx_guide_std_rank ON guide_standard_levels(rank);

-- Company-specific internal titles (e.g. Flipkart "MTS", Google "L5")
CREATE TABLE guide_company_levels (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title       VARCHAR(100) NOT NULL,          -- exact internal title
    description VARCHAR(500),
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP,
    UNIQUE (company_id, title)                  -- one title per company, no duplicates
);

CREATE INDEX idx_guide_co_level_company ON guide_company_levels(company_id);

-- Maps a company's internal title → a standard benchmark level (many-to-one)
-- Multiple company levels can map to the same standard level (e.g. SDE-II and L4 both → "Mid")
-- One company level maps to exactly one standard level
CREATE TABLE guide_mappings (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_company_level_id  UUID NOT NULL UNIQUE REFERENCES guide_company_levels(id) ON DELETE CASCADE,
    guide_standard_level_id UUID NOT NULL        REFERENCES guide_standard_levels(id) ON DELETE RESTRICT,
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP
);

-- Covering index: public grid query joins guide_mappings → guide_company_levels → companies
-- This index makes "give me all mappings for these company IDs" fast
CREATE INDEX idx_guide_mapping_std ON guide_mappings(guide_standard_level_id);
