-- V23__benefits_with_amount.sql
-- Migrates benefits from TEXT[] to JSONB to support name + optional amount per benefit.
-- Each existing string entry is converted to {"name": "...", "amount": null}.
-- The column is stored as TEXT (JSON string) handled by JPA AttributeConverter —
-- no Postgres JSONB operator dependency, works identically on any JDBC driver.

ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS benefits_v2 TEXT;

-- Migrate existing TEXT[] data → JSON array of {name, amount} objects
UPDATE companies
SET benefits_v2 = (
    SELECT json_agg(json_build_object('name', elem, 'amount', NULL))::TEXT
    FROM unnest(benefits) AS elem
)
WHERE benefits IS NOT NULL AND array_length(benefits, 1) > 0;

-- Default empty array for rows with no benefits
UPDATE companies
SET benefits_v2 = '[]'
WHERE benefits_v2 IS NULL;

-- Drop old column, rename new one
ALTER TABLE companies DROP COLUMN IF EXISTS benefits;
ALTER TABLE companies RENAME COLUMN benefits_v2 TO benefits;

-- Not-null with empty array default
ALTER TABLE companies ALTER COLUMN benefits SET NOT NULL;
ALTER TABLE companies ALTER COLUMN benefits SET DEFAULT '[]';
