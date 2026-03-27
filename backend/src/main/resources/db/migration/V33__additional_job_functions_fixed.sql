-- V33: Re-apply additional job functions (replaces failed V31).
-- Fully self-contained: inserts parent job_function rows before child function_levels.
-- All statements use ON CONFLICT DO NOTHING so this is safe to run on any DB state.

-- ── Design ───────────────────────────────────────────────────────────────────
INSERT INTO job_functions (id, name, display_name, sort_order, created_at)
VALUES ('f0000004-0000-0000-0000-000000000004', 'DESIGN', 'Design', 4, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO function_levels (id, job_function_id, name, sort_order, created_at) VALUES
    (gen_random_uuid(), 'f0000004-0000-0000-0000-000000000004', 'Junior Designer',          1, NOW()),
    (gen_random_uuid(), 'f0000004-0000-0000-0000-000000000004', 'Designer',                  2, NOW()),
    (gen_random_uuid(), 'f0000004-0000-0000-0000-000000000004', 'Senior Designer',            3, NOW()),
    (gen_random_uuid(), 'f0000004-0000-0000-0000-000000000004', 'Staff Designer',             4, NOW()),
    (gen_random_uuid(), 'f0000004-0000-0000-0000-000000000004', 'Lead Designer',              5, NOW()),
    (gen_random_uuid(), 'f0000004-0000-0000-0000-000000000004', 'Principal Designer',         6, NOW()),
    (gen_random_uuid(), 'f0000004-0000-0000-0000-000000000004', 'Design Manager',             7, NOW()),
    (gen_random_uuid(), 'f0000004-0000-0000-0000-000000000004', 'Sr. Design Manager',         8, NOW()),
    (gen_random_uuid(), 'f0000004-0000-0000-0000-000000000004', 'Director of Design',         9, NOW()),
    (gen_random_uuid(), 'f0000004-0000-0000-0000-000000000004', 'VP Design',                 10, NOW())
ON CONFLICT (job_function_id, name) DO NOTHING;

-- ── Analytics / Data Science ──────────────────────────────────────────────────
INSERT INTO job_functions (id, name, display_name, sort_order, created_at)
VALUES ('f0000005-0000-0000-0000-000000000005', 'ANALYTICS', 'Analytics & Data Science', 5, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO function_levels (id, job_function_id, name, sort_order, created_at) VALUES
    (gen_random_uuid(), 'f0000005-0000-0000-0000-000000000005', 'Data Analyst',              1, NOW()),
    (gen_random_uuid(), 'f0000005-0000-0000-0000-000000000005', 'Sr. Data Analyst',           2, NOW()),
    (gen_random_uuid(), 'f0000005-0000-0000-0000-000000000005', 'Data Scientist',             3, NOW()),
    (gen_random_uuid(), 'f0000005-0000-0000-0000-000000000005', 'Sr. Data Scientist',         4, NOW()),
    (gen_random_uuid(), 'f0000005-0000-0000-0000-000000000005', 'Staff Data Scientist',       5, NOW()),
    (gen_random_uuid(), 'f0000005-0000-0000-0000-000000000005', 'Analytics Manager',          6, NOW()),
    (gen_random_uuid(), 'f0000005-0000-0000-0000-000000000005', 'Director of Analytics',      7, NOW()),
    (gen_random_uuid(), 'f0000005-0000-0000-0000-000000000005', 'VP Analytics',               8, NOW())
ON CONFLICT (job_function_id, name) DO NOTHING;

-- ── Marketing & Growth ────────────────────────────────────────────────────────
INSERT INTO job_functions (id, name, display_name, sort_order, created_at)
VALUES ('f0000006-0000-0000-0000-000000000006', 'MARKETING', 'Marketing & Growth', 6, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO function_levels (id, job_function_id, name, sort_order, created_at) VALUES
    (gen_random_uuid(), 'f0000006-0000-0000-0000-000000000006', 'Marketing Associate',       1, NOW()),
    (gen_random_uuid(), 'f0000006-0000-0000-0000-000000000006', 'Marketing Manager',          2, NOW()),
    (gen_random_uuid(), 'f0000006-0000-0000-0000-000000000006', 'Sr. Marketing Manager',      3, NOW()),
    (gen_random_uuid(), 'f0000006-0000-0000-0000-000000000006', 'Growth Manager',             4, NOW()),
    (gen_random_uuid(), 'f0000006-0000-0000-0000-000000000006', 'Director of Marketing',      5, NOW()),
    (gen_random_uuid(), 'f0000006-0000-0000-0000-000000000006', 'VP Marketing',               6, NOW()),
    (gen_random_uuid(), 'f0000006-0000-0000-0000-000000000006', 'Chief Marketing Officer',    7, NOW())
ON CONFLICT (job_function_id, name) DO NOTHING;

-- ── Sales ─────────────────────────────────────────────────────────────────────
INSERT INTO job_functions (id, name, display_name, sort_order, created_at)
VALUES ('f0000007-0000-0000-0000-000000000007', 'SALES', 'Sales', 7, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO function_levels (id, job_function_id, name, sort_order, created_at) VALUES
    (gen_random_uuid(), 'f0000007-0000-0000-0000-000000000007', 'Sales Development Rep',     1, NOW()),
    (gen_random_uuid(), 'f0000007-0000-0000-0000-000000000007', 'Account Executive',          2, NOW()),
    (gen_random_uuid(), 'f0000007-0000-0000-0000-000000000007', 'Sr. Account Executive',      3, NOW()),
    (gen_random_uuid(), 'f0000007-0000-0000-0000-000000000007', 'Sales Manager',              4, NOW()),
    (gen_random_uuid(), 'f0000007-0000-0000-0000-000000000007', 'Sr. Sales Manager',          5, NOW()),
    (gen_random_uuid(), 'f0000007-0000-0000-0000-000000000007', 'Director of Sales',          6, NOW()),
    (gen_random_uuid(), 'f0000007-0000-0000-0000-000000000007', 'VP Sales',                   7, NOW())
ON CONFLICT (job_function_id, name) DO NOTHING;

-- ── HR & People ───────────────────────────────────────────────────────────────
INSERT INTO job_functions (id, name, display_name, sort_order, created_at)
VALUES ('f0000008-0000-0000-0000-000000000008', 'HR', 'HR & People', 8, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO function_levels (id, job_function_id, name, sort_order, created_at) VALUES
    (gen_random_uuid(), 'f0000008-0000-0000-0000-000000000008', 'HR Associate',               1, NOW()),
    (gen_random_uuid(), 'f0000008-0000-0000-0000-000000000008', 'HR Business Partner',        2, NOW()),
    (gen_random_uuid(), 'f0000008-0000-0000-0000-000000000008', 'Sr. HR Business Partner',    3, NOW()),
    (gen_random_uuid(), 'f0000008-0000-0000-0000-000000000008', 'HR Manager',                 4, NOW()),
    (gen_random_uuid(), 'f0000008-0000-0000-0000-000000000008', 'Director of HR',             5, NOW()),
    (gen_random_uuid(), 'f0000008-0000-0000-0000-000000000008', 'VP People',                  6, NOW()),
    (gen_random_uuid(), 'f0000008-0000-0000-0000-000000000008', 'Chief People Officer',       7, NOW())
ON CONFLICT (job_function_id, name) DO NOTHING;

-- ── Finance ───────────────────────────────────────────────────────────────────
INSERT INTO job_functions (id, name, display_name, sort_order, created_at)
VALUES ('f0000009-0000-0000-0000-000000000009', 'FINANCE', 'Finance', 9, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO function_levels (id, job_function_id, name, sort_order, created_at) VALUES
    (gen_random_uuid(), 'f0000009-0000-0000-0000-000000000009', 'Finance Analyst',            1, NOW()),
    (gen_random_uuid(), 'f0000009-0000-0000-0000-000000000009', 'Sr. Finance Analyst',        2, NOW()),
    (gen_random_uuid(), 'f0000009-0000-0000-0000-000000000009', 'Finance Manager',            3, NOW()),
    (gen_random_uuid(), 'f0000009-0000-0000-0000-000000000009', 'Sr. Finance Manager',        4, NOW()),
    (gen_random_uuid(), 'f0000009-0000-0000-0000-000000000009', 'Director of Finance',        5, NOW()),
    (gen_random_uuid(), 'f0000009-0000-0000-0000-000000000009', 'VP Finance',                 6, NOW()),
    (gen_random_uuid(), 'f0000009-0000-0000-0000-000000000009', 'Chief Financial Officer',    7, NOW())
ON CONFLICT (job_function_id, name) DO NOTHING;

-- ── Operations ────────────────────────────────────────────────────────────────
INSERT INTO job_functions (id, name, display_name, sort_order, created_at)
VALUES ('f0000010-0000-0000-0000-000000000010', 'OPERATIONS', 'Operations', 10, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO function_levels (id, job_function_id, name, sort_order, created_at) VALUES
    (gen_random_uuid(), 'f0000010-0000-0000-0000-000000000010', 'Operations Associate',      1, NOW()),
    (gen_random_uuid(), 'f0000010-0000-0000-0000-000000000010', 'Operations Manager',         2, NOW()),
    (gen_random_uuid(), 'f0000010-0000-0000-0000-000000000010', 'Sr. Operations Manager',     3, NOW()),
    (gen_random_uuid(), 'f0000010-0000-0000-0000-000000000010', 'Director of Operations',     4, NOW()),
    (gen_random_uuid(), 'f0000010-0000-0000-0000-000000000010', 'VP Operations',              5, NOW()),
    (gen_random_uuid(), 'f0000010-0000-0000-0000-000000000010', 'Chief Operating Officer',    6, NOW())
ON CONFLICT (job_function_id, name) DO NOTHING;

-- ── Support ───────────────────────────────────────────────────────────────────
INSERT INTO job_functions (id, name, display_name, sort_order, created_at)
VALUES ('f0000011-0000-0000-0000-000000000011', 'SUPPORT', 'Customer Support', 11, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO function_levels (id, job_function_id, name, sort_order, created_at) VALUES
    (gen_random_uuid(), 'f0000011-0000-0000-0000-000000000011', 'Support Associate',          1, NOW()),
    (gen_random_uuid(), 'f0000011-0000-0000-0000-000000000011', 'Support Specialist',         2, NOW()),
    (gen_random_uuid(), 'f0000011-0000-0000-0000-000000000011', 'Sr. Support Specialist',     3, NOW()),
    (gen_random_uuid(), 'f0000011-0000-0000-0000-000000000011', 'Support Manager',            4, NOW()),
    (gen_random_uuid(), 'f0000011-0000-0000-0000-000000000011', 'Director of Support',        5, NOW())
ON CONFLICT (job_function_id, name) DO NOTHING;

-- ── Legal ─────────────────────────────────────────────────────────────────────
INSERT INTO job_functions (id, name, display_name, sort_order, created_at)
VALUES ('f0000012-0000-0000-0000-000000000012', 'LEGAL', 'Legal', 12, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO function_levels (id, job_function_id, name, sort_order, created_at) VALUES
    (gen_random_uuid(), 'f0000012-0000-0000-0000-000000000012', 'Legal Associate',            1, NOW()),
    (gen_random_uuid(), 'f0000012-0000-0000-0000-000000000012', 'Counsel',                    2, NOW()),
    (gen_random_uuid(), 'f0000012-0000-0000-0000-000000000012', 'Sr. Counsel',                3, NOW()),
    (gen_random_uuid(), 'f0000012-0000-0000-0000-000000000012', 'Director of Legal',          4, NOW()),
    (gen_random_uuid(), 'f0000012-0000-0000-0000-000000000012', 'General Counsel',            5, NOW())
ON CONFLICT (job_function_id, name) DO NOTHING;
