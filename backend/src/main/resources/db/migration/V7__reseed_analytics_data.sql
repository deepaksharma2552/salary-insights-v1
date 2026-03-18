-- V7__reseed_analytics_data.sql
-- Fix analytics data: old seed rows used pre-enum free-text values for
-- location ('San Francisco, CA') and company_internal_level ('SDE-I').
-- V5 and V6 migrations nulled those out, leaving analytics charts empty.
-- This migration deletes the broken seed rows and re-inserts them with
-- correct enum values so the analytics queries return real data.

-- ── 1. Remove old seed entries that have null location or null internal level
--       (these are the V2 rows that were invalidated by V5/V6)
DELETE FROM salary_entries
WHERE company_id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555'
);

-- ── 2. Insert fresh approved entries with valid Location + InternalLevel enums

-- TechCorp Inc. — Bengaluru
INSERT INTO salary_entries (id, company_id, job_title, department, experience_level,
    company_internal_level, location, base_salary, bonus, equity,
    total_compensation, employment_type, review_status, created_at)
VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Software Engineer',        'Engineering', 'ENTRY',    'SDE_1',               'BENGALURU', 1200000, 100000, 50000,  1350000, 'FULL_TIME', 'APPROVED', NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Software Engineer II',     'Engineering', 'MID',      'SDE_2',               'BENGALURU', 1800000, 200000, 100000, 2100000, 'FULL_TIME', 'APPROVED', NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Senior Software Engineer', 'Engineering', 'SENIOR',   'SDE_3',               'BENGALURU', 2800000, 400000, 300000, 3500000, 'FULL_TIME', 'APPROVED', NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Staff Engineer',           'Engineering', 'LEAD',     'STAFF_ENGINEER',      'BENGALURU', 3800000, 600000, 500000, 4900000, 'FULL_TIME', 'APPROVED', NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Principal Engineer',       'Engineering', 'LEAD',     'PRINCIPAL_ENGINEER',  'DELHI_NCR', 5000000, 800000, 800000, 6600000, 'FULL_TIME', 'APPROVED', NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Engineering Manager',      'Engineering', 'MANAGER',  'ENGINEERING_MANAGER', 'HYDERABAD', 4200000, 700000, 600000, 5500000, 'FULL_TIME', 'APPROVED', NOW());

-- StartupXYZ — Pune & Hyderabad
INSERT INTO salary_entries (id, company_id, job_title, department, experience_level,
    company_internal_level, location, base_salary, bonus, equity,
    total_compensation, employment_type, review_status, created_at)
VALUES
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'Frontend Developer',     'Engineering', 'ENTRY',   'SDE_1',              'PUNE',      900000,  80000,  30000,  1010000, 'FULL_TIME', 'APPROVED', NOW()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'Backend Developer',      'Engineering', 'MID',     'SDE_2',              'PUNE',      1400000, 120000, 80000,  1600000, 'FULL_TIME', 'APPROVED', NOW()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'Full Stack Engineer',    'Engineering', 'SENIOR',  'SDE_3',              'HYDERABAD', 2200000, 300000, 200000, 2700000, 'FULL_TIME', 'APPROVED', NOW()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'Engineering Manager',    'Engineering', 'MANAGER', 'ENGINEERING_MANAGER','PUNE',      3200000, 450000, 350000, 4000000, 'FULL_TIME', 'APPROVED', NOW());

-- MegaBank Corp — Delhi-NCR & Bengaluru
INSERT INTO salary_entries (id, company_id, job_title, department, experience_level,
    company_internal_level, location, base_salary, bonus, equity,
    total_compensation, employment_type, review_status, created_at)
VALUES
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 'Data Engineer',        'Analytics',   'MID',      'SDE_2',               'DELHI_NCR', 1600000, 200000, 0,      1800000, 'FULL_TIME', 'APPROVED', NOW()),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 'Data Scientist',       'Analytics',   'SENIOR',   'SDE_3',               'BENGALURU', 2500000, 350000, 150000, 3000000, 'FULL_TIME', 'APPROVED', NOW()),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 'Senior Architect',     'Engineering', 'LEAD',     'ARCHITECT',           'DELHI_NCR', 4500000, 700000, 500000, 5700000, 'FULL_TIME', 'APPROVED', NOW()),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 'Director Engineering', 'Engineering', 'DIRECTOR', 'DIRECTOR',            'DELHI_NCR', 7000000, 1200000,1000000,9200000, 'FULL_TIME', 'APPROVED', NOW());

-- HealthPlus Ltd — Kochi & Pune
INSERT INTO salary_entries (id, company_id, job_title, department, experience_level,
    company_internal_level, location, base_salary, bonus, equity,
    total_compensation, employment_type, review_status, created_at)
VALUES
  (gen_random_uuid(), '44444444-4444-4444-4444-444444444444', 'Software Engineer',        'Engineering', 'ENTRY',   'SDE_1',               'KOCHI',     800000,  60000,  0,      860000,  'FULL_TIME', 'APPROVED', NOW()),
  (gen_random_uuid(), '44444444-4444-4444-4444-444444444444', 'Senior Software Engineer', 'Engineering', 'SENIOR',  'SDE_3',               'KOCHI',     2000000, 250000, 100000, 2350000, 'FULL_TIME', 'APPROVED', NOW()),
  (gen_random_uuid(), '44444444-4444-4444-4444-444444444444', 'Staff Engineer',           'Engineering', 'LEAD',    'STAFF_ENGINEER',      'PUNE',      3200000, 450000, 400000, 4050000, 'FULL_TIME', 'APPROVED', NOW());

-- RetailGiant Co — Bengaluru & Hyderabad
INSERT INTO salary_entries (id, company_id, job_title, department, experience_level,
    company_internal_level, location, base_salary, bonus, equity,
    total_compensation, employment_type, review_status, created_at)
VALUES
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', 'SDE 1',                    'Engineering', 'ENTRY',   'SDE_1',               'BENGALURU', 1100000, 90000,  40000,  1230000, 'FULL_TIME', 'APPROVED', NOW()),
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', 'SDE 2',                    'Engineering', 'MID',     'SDE_2',               'BENGALURU', 1700000, 180000, 100000, 1980000, 'FULL_TIME', 'APPROVED', NOW()),
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', 'Senior SDE',               'Engineering', 'SENIOR',  'SDE_3',               'HYDERABAD', 2600000, 320000, 250000, 3170000, 'FULL_TIME', 'APPROVED', NOW()),
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', 'Sr. Engineering Manager',  'Engineering', 'MANAGER', 'SR_ENGINEERING_MANAGER','BENGALURU',5500000, 900000, 700000, 7100000, 'FULL_TIME', 'APPROVED', NOW());
