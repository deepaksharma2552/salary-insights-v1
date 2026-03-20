-- V12__job_functions.sql
-- Job Function + Function Level tables for salary submissions.
-- Completely separate from the Level Guide (guide_*) and salary-analytics level tables.

-- Job functions (e.g. Engineering, Product, Program)
CREATE TABLE job_functions (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(100) NOT NULL UNIQUE,   -- e.g. "Engineering"
    display_name VARCHAR(100) NOT NULL,           -- e.g. "Engineering"
    sort_order   INTEGER      NOT NULL DEFAULT 0,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP
);

CREATE INDEX idx_job_function_sort ON job_functions(sort_order);

-- Levels within each function (e.g. Engineering → SDE 1, Product → PM)
CREATE TABLE function_levels (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    job_function_id  UUID         NOT NULL REFERENCES job_functions(id) ON DELETE CASCADE,
    name             VARCHAR(100) NOT NULL,       -- e.g. "SDE 1", "Product Manager"
    sort_order       INTEGER      NOT NULL DEFAULT 0,
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP,
    UNIQUE (job_function_id, name)               -- no duplicate level names within a function
);

CREATE INDEX idx_function_level_function ON function_levels(job_function_id);
CREATE INDEX idx_function_level_sort     ON function_levels(job_function_id, sort_order);

-- Add FK columns to salary_entries (nullable — safe for existing rows)
ALTER TABLE salary_entries
    ADD COLUMN job_function_id  UUID REFERENCES job_functions(id)  ON DELETE SET NULL,
    ADD COLUMN function_level_id UUID REFERENCES function_levels(id) ON DELETE SET NULL;

CREATE INDEX idx_salary_function       ON salary_entries(job_function_id);
CREATE INDEX idx_salary_function_level ON salary_entries(function_level_id);

-- ── Seed default functions and their levels ──────────────────────────────────
-- Engineering
INSERT INTO job_functions (id, name, display_name, sort_order, created_at)
VALUES ('f0000001-0000-0000-0000-000000000001', 'ENGINEERING', 'Engineering', 1, NOW());

INSERT INTO function_levels (id, job_function_id, name, sort_order, created_at) VALUES
    (gen_random_uuid(), 'f0000001-0000-0000-0000-000000000001', 'SDE 1',                   1,  NOW()),
    (gen_random_uuid(), 'f0000001-0000-0000-0000-000000000001', 'SDE 2',                   2,  NOW()),
    (gen_random_uuid(), 'f0000001-0000-0000-0000-000000000001', 'SDE 3',                   3,  NOW()),
    (gen_random_uuid(), 'f0000001-0000-0000-0000-000000000001', 'Staff Engineer',           4,  NOW()),
    (gen_random_uuid(), 'f0000001-0000-0000-0000-000000000001', 'Principal Engineer',       5,  NOW()),
    (gen_random_uuid(), 'f0000001-0000-0000-0000-000000000001', 'Architect',                6,  NOW()),
    (gen_random_uuid(), 'f0000001-0000-0000-0000-000000000001', 'Engineering Manager',      7,  NOW()),
    (gen_random_uuid(), 'f0000001-0000-0000-0000-000000000001', 'Sr. Engineering Manager',  8,  NOW()),
    (gen_random_uuid(), 'f0000001-0000-0000-0000-000000000001', 'Director',                 9,  NOW()),
    (gen_random_uuid(), 'f0000001-0000-0000-0000-000000000001', 'Sr. Director',             10, NOW()),
    (gen_random_uuid(), 'f0000001-0000-0000-0000-000000000001', 'VP Engineering',           11, NOW());

-- Product
INSERT INTO job_functions (id, name, display_name, sort_order, created_at)
VALUES ('f0000002-0000-0000-0000-000000000002', 'PRODUCT', 'Product', 2, NOW());

INSERT INTO function_levels (id, job_function_id, name, sort_order, created_at) VALUES
    (gen_random_uuid(), 'f0000002-0000-0000-0000-000000000002', 'Associate Product Manager', 1, NOW()),
    (gen_random_uuid(), 'f0000002-0000-0000-0000-000000000002', 'Product Manager',            2, NOW()),
    (gen_random_uuid(), 'f0000002-0000-0000-0000-000000000002', 'Sr. Product Manager',        3, NOW()),
    (gen_random_uuid(), 'f0000002-0000-0000-0000-000000000002', 'Principal PM',               4, NOW()),
    (gen_random_uuid(), 'f0000002-0000-0000-0000-000000000002', 'Group Product Manager',      5, NOW()),
    (gen_random_uuid(), 'f0000002-0000-0000-0000-000000000002', 'Director of Product',        6, NOW()),
    (gen_random_uuid(), 'f0000002-0000-0000-0000-000000000002', 'Sr. Director of Product',    7, NOW()),
    (gen_random_uuid(), 'f0000002-0000-0000-0000-000000000002', 'VP Product',                 8, NOW()),
    (gen_random_uuid(), 'f0000002-0000-0000-0000-000000000002', 'Chief Product Officer',      9, NOW());

-- Program
INSERT INTO job_functions (id, name, display_name, sort_order, created_at)
VALUES ('f0000003-0000-0000-0000-000000000003', 'PROGRAM', 'Program', 3, NOW());

INSERT INTO function_levels (id, job_function_id, name, sort_order, created_at) VALUES
    (gen_random_uuid(), 'f0000003-0000-0000-0000-000000000003', 'Program Coordinator',       1, NOW()),
    (gen_random_uuid(), 'f0000003-0000-0000-0000-000000000003', 'Program Manager',            2, NOW()),
    (gen_random_uuid(), 'f0000003-0000-0000-0000-000000000003', 'Sr. Program Manager',        3, NOW()),
    (gen_random_uuid(), 'f0000003-0000-0000-0000-000000000003', 'Principal Program Manager',  4, NOW()),
    (gen_random_uuid(), 'f0000003-0000-0000-0000-000000000003', 'Director of Programs',       5, NOW()),
    (gen_random_uuid(), 'f0000003-0000-0000-0000-000000000003', 'Sr. Director of Programs',   6, NOW()),
    (gen_random_uuid(), 'f0000003-0000-0000-0000-000000000003', 'VP Programs',                7, NOW());

-- ── Migrate existing entries → Engineering function ───────────────────────────
-- All existing salary_entries that have a company_internal_level (Engineering enum)
-- get backfilled to the Engineering function. function_level_id stays NULL for now
-- since matching old enum values to new level names would require complex string matching.
UPDATE salary_entries
SET job_function_id = 'f0000001-0000-0000-0000-000000000001'
WHERE company_internal_level IS NOT NULL
  AND job_function_id IS NULL;
