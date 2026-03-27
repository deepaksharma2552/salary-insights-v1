-- V32__repair_job_functions.sql
-- Repair migration: ensures the 3 base job_functions from V12 exist with their
-- canonical hardcoded UUIDs. V31 references these as foreign keys, and if V12
-- failed or was partially applied on production, those rows may be missing.
-- All inserts use ON CONFLICT DO NOTHING — safe to run even if V12 succeeded.

INSERT INTO job_functions (id, name, display_name, sort_order, created_at)
VALUES ('f0000001-0000-0000-0000-000000000001', 'ENGINEERING', 'Engineering', 1, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO job_functions (id, name, display_name, sort_order, created_at)
VALUES ('f0000002-0000-0000-0000-000000000002', 'PRODUCT', 'Product', 2, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO job_functions (id, name, display_name, sort_order, created_at)
VALUES ('f0000003-0000-0000-0000-000000000003', 'PROGRAM', 'Program', 3, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO job_functions (id, name, display_name, sort_order, created_at)
VALUES ('f0000004-0000-0000-0000-000000000004', 'DESIGN', 'Design', 4, NOW())
ON CONFLICT (id) DO NOTHING;
