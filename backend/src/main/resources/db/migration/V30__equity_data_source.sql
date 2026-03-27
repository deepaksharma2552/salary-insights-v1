-- V30: Store raw equity grant and data source on salary entries
-- data_source: tracks where the data came from (levels.fyi, glassdoor, reddit, User, etc.)
-- equity_total_grant: the original total RSU grant value before vesting normalisation

ALTER TABLE salary_entries
    ADD COLUMN IF NOT EXISTS data_source      VARCHAR(255),
    ADD COLUMN IF NOT EXISTS equity_total_grant NUMERIC(15, 2);
