-- V35: Add YOE bands to function_levels for DB-driven standardized level mapping.
-- minYoe is inclusive, maxYoe is exclusive (e.g. minYoe=3, maxYoe=6 → 3 ≤ yoe < 6).
-- Both columns are nullable — null means no band configured; fallback to hardcoded ladder.

ALTER TABLE function_levels
    ADD COLUMN IF NOT EXISTS min_yoe INTEGER,
    ADD COLUMN IF NOT EXISTS max_yoe INTEGER;

COMMENT ON COLUMN function_levels.min_yoe IS 'Inclusive lower YOE bound for this level band (null = not configured)';
COMMENT ON COLUMN function_levels.max_yoe IS 'Exclusive upper YOE bound for this level band (null = not configured)';
