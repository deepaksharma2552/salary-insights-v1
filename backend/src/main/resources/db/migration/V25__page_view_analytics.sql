-- ── Page view analytics — two-table design ─────────────────────────────────
--
-- page_view_events : raw append-only events, partitioned by month.
--   Written on every page visit (fire-and-forget).
--   processed = false until the hourly job aggregates them.
--   Old partitions can be dropped after aggregation — data lives in daily summary.
--
-- page_view_daily  : pre-aggregated daily counts per page.
--   Always tiny (pages × days). Dashboard only queries this table.
--   UPSERT-updated by the hourly @Scheduled job.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS page_view_events (
    id              UUID         NOT NULL DEFAULT gen_random_uuid(),
    page            VARCHAR(255) NOT NULL,
    session_hash    VARCHAR(64)  NOT NULL,  -- SHA-256(ip + ua + date), no PII stored
    referrer        VARCHAR(500),
    processed       BOOLEAN      NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

-- Initial partitions: current month + next month (job auto-creates future ones)
CREATE TABLE page_view_events_2026_03
    PARTITION OF page_view_events
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE page_view_events_2026_04
    PARTITION OF page_view_events
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE page_view_events_2026_05
    PARTITION OF page_view_events
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

-- Index only on columns the job needs — minimal write overhead
CREATE INDEX idx_pve_unprocessed   ON page_view_events (created_at) WHERE processed = false;
CREATE INDEX idx_pve_session_page  ON page_view_events (page, session_hash, created_at);

-- ── Daily aggregated summary ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS page_view_daily (
    page             VARCHAR(255) NOT NULL,
    date             DATE         NOT NULL,
    views            BIGINT       NOT NULL DEFAULT 0,
    unique_sessions  BIGINT       NOT NULL DEFAULT 0,
    PRIMARY KEY (page, date)
);

CREATE INDEX idx_pvd_date ON page_view_daily (date DESC);
