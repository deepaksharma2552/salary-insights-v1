-- V26: Indexes to support the Admin "Approved Salaries" feature at 200k–500k row scale.
--
-- Query patterns this feature runs:
--   1. WHERE review_status = 'APPROVED' [+ company_id] ORDER BY created_at DESC  → keyset pagination
--   2. WHERE review_status = 'APPROVED' AND job_title ILIKE '%…%'                → text search
--   3. WHERE review_status = 'APPROVED' AND experience_level IN (…)              → enum filter
--   4. WHERE review_status = 'APPROVED' AND location IN (…)                      → enum filter
--
-- Existing single-column indexes already cover company_id, review_status, etc.
-- The composite indexes below eliminate the extra sort / filter passes at scale.

-- Primary pagination index: status + time descending (covers the default sort)
CREATE INDEX IF NOT EXISTS idx_salary_approved_created
    ON salary_entries (review_status, created_at DESC)
    WHERE review_status = 'APPROVED';

-- Company-scoped approved list (most common admin filter)
CREATE INDEX IF NOT EXISTS idx_salary_approved_company_created
    ON salary_entries (review_status, company_id, created_at DESC)
    WHERE review_status = 'APPROVED';

-- Experience level filter on approved rows
CREATE INDEX IF NOT EXISTS idx_salary_approved_exp_level
    ON salary_entries (review_status, experience_level)
    WHERE review_status = 'APPROVED';

-- Location filter on approved rows
CREATE INDEX IF NOT EXISTS idx_salary_approved_location
    ON salary_entries (review_status, location)
    WHERE review_status = 'APPROVED';
