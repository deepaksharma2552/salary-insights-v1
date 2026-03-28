-- V36__add_intern_levels.sql
-- Adds Intern as sort_order 0 (pre-entry) level to Engineering, Product and Design.
-- min_yoe = 0, max_yoe = 1. Safe to re-run — uses ON CONFLICT DO NOTHING.

INSERT INTO function_levels (id, job_function_id, name, sort_order, min_yoe, max_yoe, created_at)
VALUES
    (gen_random_uuid(), 'f0000001-0000-0000-0000-000000000001', 'Intern', 0, 0, 1, NOW()),
    (gen_random_uuid(), 'f0000002-0000-0000-0000-000000000002', 'Intern', 0, 0, 1, NOW()),
    (gen_random_uuid(), '97fbf68d-139b-406d-8f1f-615c26fe51ee', 'Intern', 0, 0, 1, NOW())
ON CONFLICT (job_function_id, name) DO NOTHING;
