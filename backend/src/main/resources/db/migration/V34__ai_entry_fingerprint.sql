-- V34__ai_entry_fingerprint.sql
-- Adds an ai_fingerprint column to salary_entries for AI deduplication lookups.
--
-- Fingerprint = SHA-256 of (companyName | jobTitle | experienceLevel | location | employmentType)
-- Multiple entries can share the same fingerprint — they represent separate real-world observations
-- over time (e.g. salary moved >10%, or data aged out past 90 days).
-- The application layer (AiSalaryEnrichmentService) decides whether to insert or skip.

ALTER TABLE salary_entries
    ADD COLUMN IF NOT EXISTS ai_fingerprint VARCHAR(64);

-- Non-unique index — speeds up the "most recent entry for this fingerprint" lookup
CREATE INDEX IF NOT EXISTS idx_salary_ai_fingerprint
    ON salary_entries (ai_fingerprint, created_at DESC)
    WHERE ai_fingerprint IS NOT NULL;
