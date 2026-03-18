-- V8__analytics_indexes.sql
-- Composite indexes to support analytics queries without full table scans

-- avgSalaryByLocationRaw: filters on review_status, groups on location
CREATE INDEX IF NOT EXISTS idx_salary_status_location
    ON salary_entries(review_status, location)
    WHERE location IS NOT NULL;

-- avgSalaryByCompanyAndLevelRaw: filters on review_status + internal_level, joins company_id
CREATE INDEX IF NOT EXISTS idx_salary_status_company_level
    ON salary_entries(review_status, company_id, company_internal_level)
    WHERE company_internal_level IS NOT NULL;

-- updated_at fallback: used in ORDER BY MAX(COALESCE(updated_at, created_at))
CREATE INDEX IF NOT EXISTS idx_salary_company_updated
    ON salary_entries(company_id, COALESCE(updated_at, created_at) DESC);
