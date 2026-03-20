-- V13__guide_levels_seed.sql
-- Seed data for the Level Guide feature.
--
-- Standard Levels: a universal 10-rung benchmark ladder (rank 1 = most junior).
-- Company Levels:  real internal titles for 8 prominent Indian tech companies,
--                  split across Engineering, Product, and Program function tracks.
-- Mappings:        each company title mapped to the appropriate standard level.
--
-- NOTE: The function_category column is added here (not in a separate V14) so
-- that the INSERT statements below can reference it in the same migration.

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 0 — Add function_category column to guide_company_levels
-- (safe to run even if column already exists — guard added below)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE guide_company_levels
    ADD COLUMN IF NOT EXISTS function_category VARCHAR(50) DEFAULT 'Engineering';

CREATE INDEX IF NOT EXISTS idx_guide_co_level_function
    ON guide_company_levels(function_category);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1 — Standard Levels (universal benchmark ladder, shared across functions)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO guide_standard_levels (id, name, rank, description)
VALUES
    ('a1000001-0000-0000-0000-000000000001', 'Intern / Trainee',       1, 'Internship or graduate trainee. Guided work, learning fundamentals.'),
    ('a1000001-0000-0000-0000-000000000002', 'Junior',                 2, 'Entry-level IC. Works on well-defined tasks with close mentorship. 0–2 yrs.'),
    ('a1000001-0000-0000-0000-000000000003', 'Mid-Level',              3, 'Independent contributor. Owns features end-to-end. 2–4 yrs.'),
    ('a1000001-0000-0000-0000-000000000004', 'Senior',                 4, 'Technical/functional depth. Mentors juniors, drives design. 4–7 yrs.'),
    ('a1000001-0000-0000-0000-000000000005', 'Staff / Lead',           5, 'Cross-team leadership. Sets standards, resolves ambiguous problems. 7–10 yrs.'),
    ('a1000001-0000-0000-0000-000000000006', 'Principal',              6, 'Org-wide influence. Architects systems or product strategy. 10+ yrs.'),
    ('a1000001-0000-0000-0000-000000000007', 'Distinguished / Fellow', 7, 'Company-wide or industry-wide impact. Rare senior IC track.'),
    ('a1000001-0000-0000-0000-000000000008', 'Manager',                5, 'First-level people manager. Delivery, hiring, team growth.'),
    ('a1000001-0000-0000-0000-000000000009', 'Senior Manager',         6, 'Manages managers or multiple teams. Director-track.'),
    ('a1000001-0000-0000-0000-000000000010', 'Director',               7, 'Department-level ownership. Strategy + execution across many teams.')
ON CONFLICT (name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2 — Companies
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO companies (id, name, industry, website, status, created_at)
VALUES
    ('b1000001-0000-0000-0000-000000000001', 'Google',    'Technology',            'https://google.com',    'ACTIVE', NOW()),
    ('b1000001-0000-0000-0000-000000000002', 'Microsoft', 'Technology',            'https://microsoft.com', 'ACTIVE', NOW()),
    ('b1000001-0000-0000-0000-000000000003', 'Amazon',    'Technology / E-Commerce','https://amazon.com',   'ACTIVE', NOW()),
    ('b1000001-0000-0000-0000-000000000004', 'Flipkart',  'E-Commerce',            'https://flipkart.com',  'ACTIVE', NOW()),
    ('b1000001-0000-0000-0000-000000000005', 'Swiggy',    'Food Tech',             'https://swiggy.com',    'ACTIVE', NOW()),
    ('b1000001-0000-0000-0000-000000000006', 'Razorpay',  'Fintech',               'https://razorpay.com',  'ACTIVE', NOW()),
    ('b1000001-0000-0000-0000-000000000007', 'Atlassian', 'Technology',            'https://atlassian.com', 'ACTIVE', NOW()),
    ('b1000001-0000-0000-0000-000000000008', 'PhonePe',   'Fintech',               'https://phonepe.com',   'ACTIVE', NOW())
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2b — Clean up any partial data from previous failed runs
-- Removes guide_mappings and guide_company_levels for the 8 seed companies
-- so the inserts below can run cleanly even on a re-run.
-- guide_standard_levels and companies are safe — they use ON CONFLICT (id).
-- ─────────────────────────────────────────────────────────────────────────────

DELETE FROM guide_mappings
WHERE guide_company_level_id IN (
    SELECT gcl.id FROM guide_company_levels gcl
    JOIN companies c ON gcl.company_id = c.id
    WHERE c.name IN ('Google','Microsoft','Amazon','Flipkart','Swiggy','Razorpay','Atlassian','PhonePe')
);

DELETE FROM guide_company_levels
WHERE company_id IN (
    SELECT id FROM companies
    WHERE name IN ('Google','Microsoft','Amazon','Flipkart','Swiggy','Razorpay','Atlassian','PhonePe')
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3 — Company Levels (function_category: Engineering / Product / Program)
-- ─────────────────────────────────────────────────────────────────────────────

-- ══ GOOGLE ══════════════════════════════════════════════════════════════════

-- Engineering
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c1000001-0000-0000-0000-000000000001', id, 'L3',  'Software Engineer (New Grad)',         'Engineering' FROM companies WHERE name='Google' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c1000001-0000-0000-0000-000000000002', id, 'L4',  'Software Engineer',                   'Engineering' FROM companies WHERE name='Google' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c1000001-0000-0000-0000-000000000003', id, 'L5',  'Senior Software Engineer',            'Engineering' FROM companies WHERE name='Google' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c1000001-0000-0000-0000-000000000004', id, 'L6',  'Staff Software Engineer',             'Engineering' FROM companies WHERE name='Google' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c1000001-0000-0000-0000-000000000005', id, 'L7',  'Senior Staff / Principal Engineer',   'Engineering' FROM companies WHERE name='Google' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c1000001-0000-0000-0000-000000000006', id, 'L8',  'Distinguished Engineer',              'Engineering' FROM companies WHERE name='Google' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c1000001-0000-0000-0000-000000000007', id, 'M3',  'Engineering Manager',                 'Engineering' FROM companies WHERE name='Google' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c1000001-0000-0000-0000-000000000008', id, 'M4',  'Senior Engineering Manager',          'Engineering' FROM companies WHERE name='Google' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c1000001-0000-0000-0000-000000000009', id, 'D1',  'Director of Engineering',             'Engineering' FROM companies WHERE name='Google' ON CONFLICT (id) DO NOTHING;

-- Product
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c1000001-0000-0000-0000-000000000011', id, 'PM (L4)',   'Product Manager',               'Product' FROM companies WHERE name='Google' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c1000001-0000-0000-0000-000000000012', id, 'PM (L5)',   'Senior Product Manager',        'Product' FROM companies WHERE name='Google' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c1000001-0000-0000-0000-000000000013', id, 'PM (L6)',   'Staff Product Manager',         'Product' FROM companies WHERE name='Google' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c1000001-0000-0000-0000-000000000014', id, 'GPM (L7)',  'Group Product Manager',         'Product' FROM companies WHERE name='Google' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c1000001-0000-0000-0000-000000000015', id, 'Director of PM', 'Director of Product Management', 'Product' FROM companies WHERE name='Google' ON CONFLICT (id) DO NOTHING;

-- Program
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c1000001-0000-0000-0000-000000000021', id, 'TPM (L4)',  'Technical Program Manager',         'Program' FROM companies WHERE name='Google' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c1000001-0000-0000-0000-000000000022', id, 'TPM (L5)',  'Senior Technical Program Manager',  'Program' FROM companies WHERE name='Google' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c1000001-0000-0000-0000-000000000023', id, 'TPM (L6)',  'Staff Technical Program Manager',   'Program' FROM companies WHERE name='Google' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c1000001-0000-0000-0000-000000000024', id, 'Director of TPM', 'Director of TPM',             'Program' FROM companies WHERE name='Google' ON CONFLICT (id) DO NOTHING;

-- ══ MICROSOFT ════════════════════════════════════════════════════════════════

-- Engineering
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c2000001-0000-0000-0000-000000000001', id, 'SDE I',           'Software Development Engineer I',         'Engineering' FROM companies WHERE name='Microsoft' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c2000001-0000-0000-0000-000000000002', id, 'SDE II',          'Software Development Engineer II',        'Engineering' FROM companies WHERE name='Microsoft' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c2000001-0000-0000-0000-000000000003', id, 'Senior SDE',      'Senior Software Development Engineer',    'Engineering' FROM companies WHERE name='Microsoft' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c2000001-0000-0000-0000-000000000004', id, 'Principal SDE',   'Principal Software Development Engineer', 'Engineering' FROM companies WHERE name='Microsoft' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c2000001-0000-0000-0000-000000000005', id, 'Partner SDE',     'Partner-level Engineer / Architect',       'Engineering' FROM companies WHERE name='Microsoft' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c2000001-0000-0000-0000-000000000006', id, 'Eng. Manager',    'Engineering Manager',                     'Engineering' FROM companies WHERE name='Microsoft' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c2000001-0000-0000-0000-000000000007', id, 'Senior EM',       'Senior Engineering Manager',              'Engineering' FROM companies WHERE name='Microsoft' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c2000001-0000-0000-0000-000000000008', id, 'Director',        'Director of Engineering',                 'Engineering' FROM companies WHERE name='Microsoft' ON CONFLICT (id) DO NOTHING;

-- Product
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c2000001-0000-0000-0000-000000000011', id, 'PM',              'Product Manager',                         'Product' FROM companies WHERE name='Microsoft' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c2000001-0000-0000-0000-000000000012', id, 'PM II',           'Product Manager II',                      'Product' FROM companies WHERE name='Microsoft' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c2000001-0000-0000-0000-000000000013', id, 'Senior PM',       'Senior Product Manager',                  'Product' FROM companies WHERE name='Microsoft' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c2000001-0000-0000-0000-000000000014', id, 'Principal PM',    'Principal Product Manager',               'Product' FROM companies WHERE name='Microsoft' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c2000001-0000-0000-0000-000000000015', id, 'Director of PM',  'Director of Product Management',          'Product' FROM companies WHERE name='Microsoft' ON CONFLICT (id) DO NOTHING;

-- Program
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c2000001-0000-0000-0000-000000000021', id, 'PM (Program)',     'Program Manager',                        'Program' FROM companies WHERE name='Microsoft' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c2000001-0000-0000-0000-000000000022', id, 'Senior PM (Prog)','Senior Program Manager',                  'Program' FROM companies WHERE name='Microsoft' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c2000001-0000-0000-0000-000000000023', id, 'Principal PM (Prog)', 'Principal Program Manager',           'Program' FROM companies WHERE name='Microsoft' ON CONFLICT (id) DO NOTHING;

-- ══ AMAZON ════════════════════════════════════════════════════════════════════

-- Engineering
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c3000001-0000-0000-0000-000000000001', id, 'SDE I',            'Software Development Engineer I',         'Engineering' FROM companies WHERE name='Amazon' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c3000001-0000-0000-0000-000000000002', id, 'SDE II',           'Software Development Engineer II',        'Engineering' FROM companies WHERE name='Amazon' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c3000001-0000-0000-0000-000000000003', id, 'SDE III',          'Senior Software Development Engineer',    'Engineering' FROM companies WHERE name='Amazon' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c3000001-0000-0000-0000-000000000004', id, 'Principal SDE',    'Principal Software Development Engineer', 'Engineering' FROM companies WHERE name='Amazon' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c3000001-0000-0000-0000-000000000005', id, 'Distinguished SDE','Distinguished Engineer',                  'Engineering' FROM companies WHERE name='Amazon' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c3000001-0000-0000-0000-000000000006', id, 'SDM I',            'Software Development Manager I',          'Engineering' FROM companies WHERE name='Amazon' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c3000001-0000-0000-0000-000000000007', id, 'SDM II',           'Software Development Manager II',         'Engineering' FROM companies WHERE name='Amazon' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c3000001-0000-0000-0000-000000000008', id, 'Director of SDE',  'Director of Software Development',        'Engineering' FROM companies WHERE name='Amazon' ON CONFLICT (id) DO NOTHING;

-- Product
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c3000001-0000-0000-0000-000000000011', id, 'PM I',             'Product Manager I',                       'Product' FROM companies WHERE name='Amazon' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c3000001-0000-0000-0000-000000000012', id, 'PM II',            'Product Manager II',                      'Product' FROM companies WHERE name='Amazon' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c3000001-0000-0000-0000-000000000013', id, 'Senior PM',        'Senior Product Manager',                  'Product' FROM companies WHERE name='Amazon' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c3000001-0000-0000-0000-000000000014', id, 'Principal PM',     'Principal Product Manager',               'Product' FROM companies WHERE name='Amazon' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c3000001-0000-0000-0000-000000000015', id, 'Director of PM',   'Director of Product Management',          'Product' FROM companies WHERE name='Amazon' ON CONFLICT (id) DO NOTHING;

-- Program
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c3000001-0000-0000-0000-000000000021', id, 'TPM I',            'Technical Program Manager I',             'Program' FROM companies WHERE name='Amazon' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c3000001-0000-0000-0000-000000000022', id, 'TPM II',           'Technical Program Manager II',            'Program' FROM companies WHERE name='Amazon' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c3000001-0000-0000-0000-000000000023', id, 'Senior TPM',       'Senior Technical Program Manager',        'Program' FROM companies WHERE name='Amazon' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c3000001-0000-0000-0000-000000000024', id, 'Principal TPM',    'Principal Technical Program Manager',     'Program' FROM companies WHERE name='Amazon' ON CONFLICT (id) DO NOTHING;

-- ══ FLIPKART ══════════════════════════════════════════════════════════════════

-- Engineering
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c4000001-0000-0000-0000-000000000001', id, 'SDE-1',            'Software Development Engineer 1',         'Engineering' FROM companies WHERE name='Flipkart' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c4000001-0000-0000-0000-000000000002', id, 'SDE-2',            'Software Development Engineer 2',         'Engineering' FROM companies WHERE name='Flipkart' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c4000001-0000-0000-0000-000000000003', id, 'SDE-3',            'Senior Software Development Engineer',    'Engineering' FROM companies WHERE name='Flipkart' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c4000001-0000-0000-0000-000000000004', id, 'MTS',              'Member of Technical Staff',               'Engineering' FROM companies WHERE name='Flipkart' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c4000001-0000-0000-0000-000000000005', id, 'Principal Eng.',   'Principal Engineer',                      'Engineering' FROM companies WHERE name='Flipkart' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c4000001-0000-0000-0000-000000000006', id, 'EM',               'Engineering Manager',                     'Engineering' FROM companies WHERE name='Flipkart' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c4000001-0000-0000-0000-000000000007', id, 'Senior EM',        'Senior Engineering Manager',              'Engineering' FROM companies WHERE name='Flipkart' ON CONFLICT (id) DO NOTHING;

-- Product
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c4000001-0000-0000-0000-000000000011', id, 'APM',              'Associate Product Manager',               'Product' FROM companies WHERE name='Flipkart' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c4000001-0000-0000-0000-000000000012', id, 'PM-1',             'Product Manager 1',                       'Product' FROM companies WHERE name='Flipkart' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c4000001-0000-0000-0000-000000000013', id, 'PM-2',             'Product Manager 2 / Senior PM',           'Product' FROM companies WHERE name='Flipkart' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c4000001-0000-0000-0000-000000000014', id, 'Senior PM',        'Senior Product Manager',                  'Product' FROM companies WHERE name='Flipkart' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c4000001-0000-0000-0000-000000000015', id, 'Director of PM',   'Director of Product Management',          'Product' FROM companies WHERE name='Flipkart' ON CONFLICT (id) DO NOTHING;

-- Program
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c4000001-0000-0000-0000-000000000021', id, 'TPM-1',            'Technical Program Manager 1',             'Program' FROM companies WHERE name='Flipkart' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c4000001-0000-0000-0000-000000000022', id, 'TPM-2',            'Technical Program Manager 2',             'Program' FROM companies WHERE name='Flipkart' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c4000001-0000-0000-0000-000000000023', id, 'Senior TPM',       'Senior Technical Program Manager',        'Program' FROM companies WHERE name='Flipkart' ON CONFLICT (id) DO NOTHING;

-- ══ SWIGGY ════════════════════════════════════════════════════════════════════

-- Engineering
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c5000001-0000-0000-0000-000000000001', id, 'SDE-1',            'Software Development Engineer 1',         'Engineering' FROM companies WHERE name='Swiggy' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c5000001-0000-0000-0000-000000000002', id, 'SDE-2',            'Software Development Engineer 2',         'Engineering' FROM companies WHERE name='Swiggy' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c5000001-0000-0000-0000-000000000003', id, 'SDE-3',            'Senior Software Development Engineer',    'Engineering' FROM companies WHERE name='Swiggy' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c5000001-0000-0000-0000-000000000004', id, 'Staff Engineer',   'Staff Engineer',                          'Engineering' FROM companies WHERE name='Swiggy' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c5000001-0000-0000-0000-000000000005', id, 'Principal Eng.',   'Principal Engineer',                      'Engineering' FROM companies WHERE name='Swiggy' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c5000001-0000-0000-0000-000000000006', id, 'EM',               'Engineering Manager',                     'Engineering' FROM companies WHERE name='Swiggy' ON CONFLICT (id) DO NOTHING;

-- Product
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c5000001-0000-0000-0000-000000000011', id, 'APM',              'Associate Product Manager',               'Product' FROM companies WHERE name='Swiggy' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c5000001-0000-0000-0000-000000000012', id, 'PM',               'Product Manager',                         'Product' FROM companies WHERE name='Swiggy' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c5000001-0000-0000-0000-000000000013', id, 'Senior PM',        'Senior Product Manager',                  'Product' FROM companies WHERE name='Swiggy' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c5000001-0000-0000-0000-000000000014', id, 'Lead PM',          'Lead / Staff Product Manager',            'Product' FROM companies WHERE name='Swiggy' ON CONFLICT (id) DO NOTHING;

-- ══ RAZORPAY ══════════════════════════════════════════════════════════════════

-- Engineering
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c6000001-0000-0000-0000-000000000001', id, 'SDE-1',            'Software Development Engineer 1',         'Engineering' FROM companies WHERE name='Razorpay' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c6000001-0000-0000-0000-000000000002', id, 'SDE-2',            'Software Development Engineer 2',         'Engineering' FROM companies WHERE name='Razorpay' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c6000001-0000-0000-0000-000000000003', id, 'SDE-3',            'Senior Software Development Engineer',    'Engineering' FROM companies WHERE name='Razorpay' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c6000001-0000-0000-0000-000000000004', id, 'Staff Engineer',   'Staff Engineer',                          'Engineering' FROM companies WHERE name='Razorpay' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c6000001-0000-0000-0000-000000000005', id, 'EM',               'Engineering Manager',                     'Engineering' FROM companies WHERE name='Razorpay' ON CONFLICT (id) DO NOTHING;

-- Product
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c6000001-0000-0000-0000-000000000011', id, 'PM',               'Product Manager',                         'Product' FROM companies WHERE name='Razorpay' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c6000001-0000-0000-0000-000000000012', id, 'Senior PM',        'Senior Product Manager',                  'Product' FROM companies WHERE name='Razorpay' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c6000001-0000-0000-0000-000000000013', id, 'Lead PM',          'Lead Product Manager',                    'Product' FROM companies WHERE name='Razorpay' ON CONFLICT (id) DO NOTHING;

-- ══ ATLASSIAN ═════════════════════════════════════════════════════════════════

-- Engineering
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c7000001-0000-0000-0000-000000000001', id, 'Associate SDE',    'Associate Software Development Engineer', 'Engineering' FROM companies WHERE name='Atlassian' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c7000001-0000-0000-0000-000000000002', id, 'SDE',              'Software Development Engineer',           'Engineering' FROM companies WHERE name='Atlassian' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c7000001-0000-0000-0000-000000000003', id, 'Senior SDE',       'Senior Software Development Engineer',    'Engineering' FROM companies WHERE name='Atlassian' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c7000001-0000-0000-0000-000000000004', id, 'Staff SDE',        'Staff Software Development Engineer',     'Engineering' FROM companies WHERE name='Atlassian' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c7000001-0000-0000-0000-000000000005', id, 'Principal SDE',    'Principal Software Development Engineer', 'Engineering' FROM companies WHERE name='Atlassian' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c7000001-0000-0000-0000-000000000006', id, 'EM',               'Engineering Manager',                     'Engineering' FROM companies WHERE name='Atlassian' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c7000001-0000-0000-0000-000000000007', id, 'Senior EM',        'Senior Engineering Manager',              'Engineering' FROM companies WHERE name='Atlassian' ON CONFLICT (id) DO NOTHING;

-- Product
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c7000001-0000-0000-0000-000000000011', id, 'PM',               'Product Manager',                         'Product' FROM companies WHERE name='Atlassian' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c7000001-0000-0000-0000-000000000012', id, 'Senior PM',        'Senior Product Manager',                  'Product' FROM companies WHERE name='Atlassian' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c7000001-0000-0000-0000-000000000013', id, 'Principal PM',     'Principal Product Manager',               'Product' FROM companies WHERE name='Atlassian' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c7000001-0000-0000-0000-000000000014', id, 'Head of PM',       'Head of Product Management',              'Product' FROM companies WHERE name='Atlassian' ON CONFLICT (id) DO NOTHING;

-- Program
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c7000001-0000-0000-0000-000000000021', id, 'TPM',              'Technical Program Manager',               'Program' FROM companies WHERE name='Atlassian' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c7000001-0000-0000-0000-000000000022', id, 'Senior TPM',       'Senior Technical Program Manager',        'Program' FROM companies WHERE name='Atlassian' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c7000001-0000-0000-0000-000000000023', id, 'Principal TPM',    'Principal Technical Program Manager',     'Program' FROM companies WHERE name='Atlassian' ON CONFLICT (id) DO NOTHING;

-- ══ PHONEPE ═══════════════════════════════════════════════════════════════════

-- Engineering
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c8000001-0000-0000-0000-000000000001', id, 'SDE-1',            'Software Development Engineer 1',         'Engineering' FROM companies WHERE name='PhonePe' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c8000001-0000-0000-0000-000000000002', id, 'SDE-2',            'Software Development Engineer 2',         'Engineering' FROM companies WHERE name='PhonePe' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c8000001-0000-0000-0000-000000000003', id, 'SDE-3',            'Senior Software Development Engineer',    'Engineering' FROM companies WHERE name='PhonePe' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c8000001-0000-0000-0000-000000000004', id, 'Staff Engineer',   'Staff Engineer',                          'Engineering' FROM companies WHERE name='PhonePe' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c8000001-0000-0000-0000-000000000005', id, 'Principal Eng.',   'Principal Engineer',                      'Engineering' FROM companies WHERE name='PhonePe' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c8000001-0000-0000-0000-000000000006', id, 'EM',               'Engineering Manager',                     'Engineering' FROM companies WHERE name='PhonePe' ON CONFLICT (id) DO NOTHING;

-- Product
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c8000001-0000-0000-0000-000000000011', id, 'APM',              'Associate Product Manager',               'Product' FROM companies WHERE name='PhonePe' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c8000001-0000-0000-0000-000000000012', id, 'PM',               'Product Manager',                         'Product' FROM companies WHERE name='PhonePe' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c8000001-0000-0000-0000-000000000013', id, 'Senior PM',        'Senior Product Manager',                  'Product' FROM companies WHERE name='PhonePe' ON CONFLICT (id) DO NOTHING;
INSERT INTO guide_company_levels (id, company_id, title, description, function_category)
SELECT 'c8000001-0000-0000-0000-000000000014', id, 'Lead PM',          'Lead Product Manager',                    'Product' FROM companies WHERE name='PhonePe' ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4 — Mappings (company level → standard level)
--          Engineering track
-- ─────────────────────────────────────────────────────────────────────────────

-- Google Engineering
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c1000001-0000-0000-0000-000000000001', id FROM guide_standard_levels WHERE name='Junior'                ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c1000001-0000-0000-0000-000000000002', id FROM guide_standard_levels WHERE name='Mid-Level'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c1000001-0000-0000-0000-000000000003', id FROM guide_standard_levels WHERE name='Senior'               ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c1000001-0000-0000-0000-000000000004', id FROM guide_standard_levels WHERE name='Staff / Lead'         ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c1000001-0000-0000-0000-000000000005', id FROM guide_standard_levels WHERE name='Principal'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c1000001-0000-0000-0000-000000000006', id FROM guide_standard_levels WHERE name='Distinguished / Fellow' ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c1000001-0000-0000-0000-000000000007', id FROM guide_standard_levels WHERE name='Manager'              ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c1000001-0000-0000-0000-000000000008', id FROM guide_standard_levels WHERE name='Senior Manager'       ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c1000001-0000-0000-0000-000000000009', id FROM guide_standard_levels WHERE name='Director'             ON CONFLICT(guide_company_level_id) DO NOTHING;

-- Google Product
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c1000001-0000-0000-0000-000000000011', id FROM guide_standard_levels WHERE name='Mid-Level'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c1000001-0000-0000-0000-000000000012', id FROM guide_standard_levels WHERE name='Senior'               ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c1000001-0000-0000-0000-000000000013', id FROM guide_standard_levels WHERE name='Staff / Lead'         ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c1000001-0000-0000-0000-000000000014', id FROM guide_standard_levels WHERE name='Principal'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c1000001-0000-0000-0000-000000000015', id FROM guide_standard_levels WHERE name='Director'             ON CONFLICT(guide_company_level_id) DO NOTHING;

-- Google Program
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c1000001-0000-0000-0000-000000000021', id FROM guide_standard_levels WHERE name='Mid-Level'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c1000001-0000-0000-0000-000000000022', id FROM guide_standard_levels WHERE name='Senior'               ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c1000001-0000-0000-0000-000000000023', id FROM guide_standard_levels WHERE name='Staff / Lead'         ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c1000001-0000-0000-0000-000000000024', id FROM guide_standard_levels WHERE name='Director'             ON CONFLICT(guide_company_level_id) DO NOTHING;

-- Microsoft Engineering
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c2000001-0000-0000-0000-000000000001', id FROM guide_standard_levels WHERE name='Junior'                ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c2000001-0000-0000-0000-000000000002', id FROM guide_standard_levels WHERE name='Mid-Level'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c2000001-0000-0000-0000-000000000003', id FROM guide_standard_levels WHERE name='Senior'               ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c2000001-0000-0000-0000-000000000004', id FROM guide_standard_levels WHERE name='Principal'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c2000001-0000-0000-0000-000000000005', id FROM guide_standard_levels WHERE name='Distinguished / Fellow' ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c2000001-0000-0000-0000-000000000006', id FROM guide_standard_levels WHERE name='Manager'              ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c2000001-0000-0000-0000-000000000007', id FROM guide_standard_levels WHERE name='Senior Manager'       ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c2000001-0000-0000-0000-000000000008', id FROM guide_standard_levels WHERE name='Director'             ON CONFLICT(guide_company_level_id) DO NOTHING;

-- Microsoft Product
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c2000001-0000-0000-0000-000000000011', id FROM guide_standard_levels WHERE name='Junior'                ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c2000001-0000-0000-0000-000000000012', id FROM guide_standard_levels WHERE name='Mid-Level'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c2000001-0000-0000-0000-000000000013', id FROM guide_standard_levels WHERE name='Senior'               ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c2000001-0000-0000-0000-000000000014', id FROM guide_standard_levels WHERE name='Principal'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c2000001-0000-0000-0000-000000000015', id FROM guide_standard_levels WHERE name='Director'             ON CONFLICT(guide_company_level_id) DO NOTHING;

-- Microsoft Program
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c2000001-0000-0000-0000-000000000021', id FROM guide_standard_levels WHERE name='Mid-Level'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c2000001-0000-0000-0000-000000000022', id FROM guide_standard_levels WHERE name='Senior'               ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c2000001-0000-0000-0000-000000000023', id FROM guide_standard_levels WHERE name='Principal'            ON CONFLICT(guide_company_level_id) DO NOTHING;

-- Amazon Engineering
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c3000001-0000-0000-0000-000000000001', id FROM guide_standard_levels WHERE name='Junior'                ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c3000001-0000-0000-0000-000000000002', id FROM guide_standard_levels WHERE name='Mid-Level'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c3000001-0000-0000-0000-000000000003', id FROM guide_standard_levels WHERE name='Senior'               ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c3000001-0000-0000-0000-000000000004', id FROM guide_standard_levels WHERE name='Principal'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c3000001-0000-0000-0000-000000000005', id FROM guide_standard_levels WHERE name='Distinguished / Fellow' ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c3000001-0000-0000-0000-000000000006', id FROM guide_standard_levels WHERE name='Manager'              ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c3000001-0000-0000-0000-000000000007', id FROM guide_standard_levels WHERE name='Senior Manager'       ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c3000001-0000-0000-0000-000000000008', id FROM guide_standard_levels WHERE name='Director'             ON CONFLICT(guide_company_level_id) DO NOTHING;

-- Amazon Product
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c3000001-0000-0000-0000-000000000011', id FROM guide_standard_levels WHERE name='Junior'                ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c3000001-0000-0000-0000-000000000012', id FROM guide_standard_levels WHERE name='Mid-Level'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c3000001-0000-0000-0000-000000000013', id FROM guide_standard_levels WHERE name='Senior'               ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c3000001-0000-0000-0000-000000000014', id FROM guide_standard_levels WHERE name='Principal'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c3000001-0000-0000-0000-000000000015', id FROM guide_standard_levels WHERE name='Director'             ON CONFLICT(guide_company_level_id) DO NOTHING;

-- Amazon Program
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c3000001-0000-0000-0000-000000000021', id FROM guide_standard_levels WHERE name='Junior'                ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c3000001-0000-0000-0000-000000000022', id FROM guide_standard_levels WHERE name='Mid-Level'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c3000001-0000-0000-0000-000000000023', id FROM guide_standard_levels WHERE name='Senior'               ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c3000001-0000-0000-0000-000000000024', id FROM guide_standard_levels WHERE name='Staff / Lead'         ON CONFLICT(guide_company_level_id) DO NOTHING;

-- Flipkart Engineering
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c4000001-0000-0000-0000-000000000001', id FROM guide_standard_levels WHERE name='Junior'                ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c4000001-0000-0000-0000-000000000002', id FROM guide_standard_levels WHERE name='Mid-Level'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c4000001-0000-0000-0000-000000000003', id FROM guide_standard_levels WHERE name='Senior'               ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c4000001-0000-0000-0000-000000000004', id FROM guide_standard_levels WHERE name='Staff / Lead'         ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c4000001-0000-0000-0000-000000000005', id FROM guide_standard_levels WHERE name='Principal'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c4000001-0000-0000-0000-000000000006', id FROM guide_standard_levels WHERE name='Manager'              ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c4000001-0000-0000-0000-000000000007', id FROM guide_standard_levels WHERE name='Senior Manager'       ON CONFLICT(guide_company_level_id) DO NOTHING;

-- Flipkart Product
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c4000001-0000-0000-0000-000000000011', id FROM guide_standard_levels WHERE name='Junior'                ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c4000001-0000-0000-0000-000000000012', id FROM guide_standard_levels WHERE name='Mid-Level'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c4000001-0000-0000-0000-000000000013', id FROM guide_standard_levels WHERE name='Senior'               ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c4000001-0000-0000-0000-000000000014', id FROM guide_standard_levels WHERE name='Staff / Lead'         ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c4000001-0000-0000-0000-000000000015', id FROM guide_standard_levels WHERE name='Director'             ON CONFLICT(guide_company_level_id) DO NOTHING;

-- Flipkart Program
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c4000001-0000-0000-0000-000000000021', id FROM guide_standard_levels WHERE name='Mid-Level'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c4000001-0000-0000-0000-000000000022', id FROM guide_standard_levels WHERE name='Senior'               ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c4000001-0000-0000-0000-000000000023', id FROM guide_standard_levels WHERE name='Staff / Lead'         ON CONFLICT(guide_company_level_id) DO NOTHING;

-- Swiggy Engineering
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c5000001-0000-0000-0000-000000000001', id FROM guide_standard_levels WHERE name='Junior'                ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c5000001-0000-0000-0000-000000000002', id FROM guide_standard_levels WHERE name='Mid-Level'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c5000001-0000-0000-0000-000000000003', id FROM guide_standard_levels WHERE name='Senior'               ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c5000001-0000-0000-0000-000000000004', id FROM guide_standard_levels WHERE name='Staff / Lead'         ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c5000001-0000-0000-0000-000000000005', id FROM guide_standard_levels WHERE name='Principal'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c5000001-0000-0000-0000-000000000006', id FROM guide_standard_levels WHERE name='Manager'              ON CONFLICT(guide_company_level_id) DO NOTHING;

-- Swiggy Product
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c5000001-0000-0000-0000-000000000011', id FROM guide_standard_levels WHERE name='Junior'                ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c5000001-0000-0000-0000-000000000012', id FROM guide_standard_levels WHERE name='Mid-Level'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c5000001-0000-0000-0000-000000000013', id FROM guide_standard_levels WHERE name='Senior'               ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c5000001-0000-0000-0000-000000000014', id FROM guide_standard_levels WHERE name='Staff / Lead'         ON CONFLICT(guide_company_level_id) DO NOTHING;

-- Razorpay Engineering
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c6000001-0000-0000-0000-000000000001', id FROM guide_standard_levels WHERE name='Junior'                ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c6000001-0000-0000-0000-000000000002', id FROM guide_standard_levels WHERE name='Mid-Level'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c6000001-0000-0000-0000-000000000003', id FROM guide_standard_levels WHERE name='Senior'               ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c6000001-0000-0000-0000-000000000004', id FROM guide_standard_levels WHERE name='Staff / Lead'         ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c6000001-0000-0000-0000-000000000005', id FROM guide_standard_levels WHERE name='Manager'              ON CONFLICT(guide_company_level_id) DO NOTHING;

-- Razorpay Product
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c6000001-0000-0000-0000-000000000011', id FROM guide_standard_levels WHERE name='Mid-Level'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c6000001-0000-0000-0000-000000000012', id FROM guide_standard_levels WHERE name='Senior'               ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c6000001-0000-0000-0000-000000000013', id FROM guide_standard_levels WHERE name='Staff / Lead'         ON CONFLICT(guide_company_level_id) DO NOTHING;

-- Atlassian Engineering
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c7000001-0000-0000-0000-000000000001', id FROM guide_standard_levels WHERE name='Junior'                ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c7000001-0000-0000-0000-000000000002', id FROM guide_standard_levels WHERE name='Mid-Level'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c7000001-0000-0000-0000-000000000003', id FROM guide_standard_levels WHERE name='Senior'               ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c7000001-0000-0000-0000-000000000004', id FROM guide_standard_levels WHERE name='Staff / Lead'         ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c7000001-0000-0000-0000-000000000005', id FROM guide_standard_levels WHERE name='Principal'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c7000001-0000-0000-0000-000000000006', id FROM guide_standard_levels WHERE name='Manager'              ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c7000001-0000-0000-0000-000000000007', id FROM guide_standard_levels WHERE name='Senior Manager'       ON CONFLICT(guide_company_level_id) DO NOTHING;

-- Atlassian Product
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c7000001-0000-0000-0000-000000000011', id FROM guide_standard_levels WHERE name='Mid-Level'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c7000001-0000-0000-0000-000000000012', id FROM guide_standard_levels WHERE name='Senior'               ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c7000001-0000-0000-0000-000000000013', id FROM guide_standard_levels WHERE name='Principal'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c7000001-0000-0000-0000-000000000014', id FROM guide_standard_levels WHERE name='Director'             ON CONFLICT(guide_company_level_id) DO NOTHING;

-- Atlassian Program
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c7000001-0000-0000-0000-000000000021', id FROM guide_standard_levels WHERE name='Mid-Level'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c7000001-0000-0000-0000-000000000022', id FROM guide_standard_levels WHERE name='Senior'               ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c7000001-0000-0000-0000-000000000023', id FROM guide_standard_levels WHERE name='Principal'            ON CONFLICT(guide_company_level_id) DO NOTHING;

-- PhonePe Engineering
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c8000001-0000-0000-0000-000000000001', id FROM guide_standard_levels WHERE name='Junior'                ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c8000001-0000-0000-0000-000000000002', id FROM guide_standard_levels WHERE name='Mid-Level'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c8000001-0000-0000-0000-000000000003', id FROM guide_standard_levels WHERE name='Senior'               ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c8000001-0000-0000-0000-000000000004', id FROM guide_standard_levels WHERE name='Staff / Lead'         ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c8000001-0000-0000-0000-000000000005', id FROM guide_standard_levels WHERE name='Principal'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c8000001-0000-0000-0000-000000000006', id FROM guide_standard_levels WHERE name='Manager'              ON CONFLICT(guide_company_level_id) DO NOTHING;

-- PhonePe Product
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c8000001-0000-0000-0000-000000000011', id FROM guide_standard_levels WHERE name='Junior'                ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c8000001-0000-0000-0000-000000000012', id FROM guide_standard_levels WHERE name='Mid-Level'            ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c8000001-0000-0000-0000-000000000013', id FROM guide_standard_levels WHERE name='Senior'               ON CONFLICT(guide_company_level_id) DO NOTHING;
INSERT INTO guide_mappings (id, guide_company_level_id, guide_standard_level_id) SELECT gen_random_uuid(), 'c8000001-0000-0000-0000-000000000014', id FROM guide_standard_levels WHERE name='Staff / Lead'         ON CONFLICT(guide_company_level_id) DO NOTHING;
