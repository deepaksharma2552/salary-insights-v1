-- V2__seed_data.sql
-- Seed data for Salary Insights Portal

-- Admin user (password: Admin@123)
INSERT INTO users (id, first_name, last_name, email, password, role, active, created_at)
VALUES (
    gen_random_uuid(),
    'Admin', 'User',
    'admin@salaryinsights.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeR5iy0kd7OEeNfSm',
    'ADMIN',
    TRUE,
    NOW()
);

-- Standard levels (Junior → C-Level)
INSERT INTO standardized_levels (id, name, hierarchy_rank, created_at) VALUES
    (gen_random_uuid(), 'Intern',    1, NOW()),
    (gen_random_uuid(), 'Junior',    2, NOW()),
    (gen_random_uuid(), 'Mid',       3, NOW()),
    (gen_random_uuid(), 'Senior',    4, NOW()),
    (gen_random_uuid(), 'Lead',      5, NOW()),
    (gen_random_uuid(), 'Principal', 6, NOW()),
    (gen_random_uuid(), 'Manager',   7, NOW()),
    (gen_random_uuid(), 'Director',  8, NOW()),
    (gen_random_uuid(), 'VP',        9, NOW()),
    (gen_random_uuid(), 'C-Level',  10, NOW());

-- Sample companies
INSERT INTO companies (id, name, industry, location, company_size, company_level_category, website, status, created_at)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'TechCorp Inc.',    'Technology',    'San Francisco, CA', '1000-5000',  'ENTERPRISE', 'https://techcorp.example.com',  'ACTIVE', NOW()),
    ('22222222-2222-2222-2222-222222222222', 'StartupXYZ',       'Technology',    'New York, NY',      '10-50',      'STARTUP',    'https://startupxyz.example.com', 'ACTIVE', NOW()),
    ('33333333-3333-3333-3333-333333333333', 'MegaBank Corp',    'Finance',       'Chicago, IL',       '10000+',     'ENTERPRISE', 'https://megabank.example.com',   'ACTIVE', NOW()),
    ('44444444-4444-4444-4444-444444444444', 'HealthPlus Ltd',   'Healthcare',    'Boston, MA',        '500-1000',   'MID_SIZE',   'https://healthplus.example.com',  'ACTIVE', NOW()),
    ('55555555-5555-5555-5555-555555555555', 'RetailGiant Co',   'Retail',        'Seattle, WA',       '5000-10000', 'ENTERPRISE', 'https://retailgiant.example.com', 'ACTIVE', NOW());

-- TechCorp internal levels
INSERT INTO company_levels (id, company_id, internal_level_name, created_at) VALUES
    ('aaaa0001-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'SDE-I',   NOW()),
    ('aaaa0002-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'SDE-II',  NOW()),
    ('aaaa0003-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'SDE-III', NOW()),
    ('aaaa0004-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Staff',   NOW()),
    ('aaaa0005-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Principal', NOW());

-- StartupXYZ internal levels
INSERT INTO company_levels (id, company_id, internal_level_name, created_at) VALUES
    ('bbbb0001-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Junior Engineer', NOW()),
    ('bbbb0002-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Engineer',        NOW()),
    ('bbbb0003-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Senior Engineer', NOW());

-- Map TechCorp levels (using subqueries for standardized level IDs)
INSERT INTO level_mappings (id, company_level_id, standardized_level_id, created_at)
SELECT gen_random_uuid(), 'aaaa0001-aaaa-aaaa-aaaa-aaaaaaaaaaaa', id, NOW()
FROM standardized_levels WHERE name = 'Junior';

INSERT INTO level_mappings (id, company_level_id, standardized_level_id, created_at)
SELECT gen_random_uuid(), 'aaaa0002-aaaa-aaaa-aaaa-aaaaaaaaaaaa', id, NOW()
FROM standardized_levels WHERE name = 'Mid';

INSERT INTO level_mappings (id, company_level_id, standardized_level_id, created_at)
SELECT gen_random_uuid(), 'aaaa0003-aaaa-aaaa-aaaa-aaaaaaaaaaaa', id, NOW()
FROM standardized_levels WHERE name = 'Senior';

INSERT INTO level_mappings (id, company_level_id, standardized_level_id, created_at)
SELECT gen_random_uuid(), 'aaaa0004-aaaa-aaaa-aaaa-aaaaaaaaaaaa', id, NOW()
FROM standardized_levels WHERE name = 'Lead';

INSERT INTO level_mappings (id, company_level_id, standardized_level_id, created_at)
SELECT gen_random_uuid(), 'aaaa0005-aaaa-aaaa-aaaa-aaaaaaaaaaaa', id, NOW()
FROM standardized_levels WHERE name = 'Principal';

-- Map StartupXYZ levels
INSERT INTO level_mappings (id, company_level_id, standardized_level_id, created_at)
SELECT gen_random_uuid(), 'bbbb0001-bbbb-bbbb-bbbb-bbbbbbbbbbbb', id, NOW()
FROM standardized_levels WHERE name = 'Junior';

INSERT INTO level_mappings (id, company_level_id, standardized_level_id, created_at)
SELECT gen_random_uuid(), 'bbbb0002-bbbb-bbbb-bbbb-bbbbbbbbbbbb', id, NOW()
FROM standardized_levels WHERE name = 'Mid';

INSERT INTO level_mappings (id, company_level_id, standardized_level_id, created_at)
SELECT gen_random_uuid(), 'bbbb0003-bbbb-bbbb-bbbb-bbbbbbbbbbbb', id, NOW()
FROM standardized_levels WHERE name = 'Senior';

-- Sample approved salary entries
INSERT INTO salary_entries (id, company_id, job_title, department, experience_level,
    company_internal_level, standardized_level_id, location,
    base_salary, bonus, equity, total_compensation, employment_type, review_status, created_at)
SELECT
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    'Software Engineer',
    'Engineering',
    'ENTRY',
    'SDE-I',
    sl.id,
    'San Francisco, CA',
    120000, 15000, 10000, 145000,
    'FULL_TIME', 'APPROVED', NOW()
FROM standardized_levels sl WHERE sl.name = 'Junior';

INSERT INTO salary_entries (id, company_id, job_title, department, experience_level,
    company_internal_level, standardized_level_id, location,
    base_salary, bonus, equity, total_compensation, employment_type, review_status, created_at)
SELECT
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    'Senior Software Engineer',
    'Engineering',
    'SENIOR',
    'SDE-III',
    sl.id,
    'San Francisco, CA',
    180000, 30000, 50000, 260000,
    'FULL_TIME', 'APPROVED', NOW()
FROM standardized_levels sl WHERE sl.name = 'Senior';

INSERT INTO salary_entries (id, company_id, job_title, department, experience_level,
    company_internal_level, standardized_level_id, location,
    base_salary, bonus, equity, total_compensation, employment_type, review_status, created_at)
SELECT
    gen_random_uuid(),
    '22222222-2222-2222-2222-222222222222',
    'Frontend Developer',
    'Engineering',
    'MID',
    'Engineer',
    sl.id,
    'New York, NY',
    130000, 10000, 5000, 145000,
    'FULL_TIME', 'APPROVED', NOW()
FROM standardized_levels sl WHERE sl.name = 'Mid';

INSERT INTO salary_entries (id, company_id, job_title, department, experience_level,
    company_internal_level, standardized_level_id, location,
    base_salary, bonus, equity, total_compensation, employment_type, review_status, created_at)
SELECT
    gen_random_uuid(),
    '33333333-3333-3333-3333-333333333333',
    'Data Scientist',
    'Analytics',
    'MID',
    NULL,
    sl.id,
    'Chicago, IL',
    140000, 20000, 0, 160000,
    'FULL_TIME', 'APPROVED', NOW()
FROM standardized_levels sl WHERE sl.name = 'Mid';
