-- V3__ai_refresh_support.sql
-- Tracks AI refresh job history for visibility in the admin panel

CREATE TABLE ai_refresh_logs (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    triggered_by        VARCHAR(255),
    status              VARCHAR(20)  NOT NULL,   -- SUCCESS | PARTIAL | FAILED
    companies_processed INTEGER      NOT NULL DEFAULT 0,
    new_salaries_added  INTEGER      NOT NULL DEFAULT 0,
    levels_detected     INTEGER      NOT NULL DEFAULT 0,
    mapping_suggestions INTEGER      NOT NULL DEFAULT 0,
    duration_ms         BIGINT,
    message             TEXT,
    detail_json         TEXT,        -- full AiRefreshResult as JSON (for debugging)
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_refresh_logs_status ON ai_refresh_logs(status);
CREATE INDEX idx_ai_refresh_logs_time   ON ai_refresh_logs(created_at DESC);
