-- V22__company_benefits.sql
-- Adds admin-managed benefits list and TC range (min/max) to companies.
-- benefits: text array of benefit names set by admin from company's benefits page.
-- tc_min / tc_max: precomputed from approved salary entries, updated by application.

ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS benefits  TEXT[]  NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS tc_min    NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS tc_max    NUMERIC(15,2);

-- Backfill tc_min / tc_max from existing approved salary entries
UPDATE companies c
SET
    tc_min = sub.min_tc,
    tc_max = sub.max_tc
FROM (
    SELECT company_id,
           MIN(total_compensation) AS min_tc,
           MAX(total_compensation) AS max_tc
    FROM salary_entries
    WHERE review_status = 'APPROVED'
      AND total_compensation IS NOT NULL
    GROUP BY company_id
) sub
WHERE c.id = sub.company_id;
