-- V20__opportunities.sql
-- Community-curated opportunities board.
-- Covers referrals, internships, full-time, contract and off-campus drives.
-- Users post → PENDING → Admin approves → LIVE → auto-expires.

CREATE TABLE opportunities (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    title               VARCHAR(200) NOT NULL,
    company_name        VARCHAR(200) NOT NULL,
    company_id          UUID         REFERENCES companies(id) ON DELETE SET NULL,
    type                VARCHAR(20)  NOT NULL CHECK (type IN ('REFERRAL','INTERNSHIP','FULL_TIME','CONTRACT','DRIVE')),
    role                VARCHAR(200),
    location            VARCHAR(100),
    work_mode           VARCHAR(10)  NOT NULL DEFAULT 'ONSITE' CHECK (work_mode IN ('REMOTE','HYBRID','ONSITE')),
    apply_link          TEXT         NOT NULL,
    stipend_or_salary   VARCHAR(100),
    experience_required VARCHAR(100),
    deadline            DATE,
    description         TEXT,
    status              VARCHAR(10)  NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','LIVE','EXPIRED','REJECTED')),
    rejection_reason    TEXT,
    posted_by           UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at          TIMESTAMP    NOT NULL,
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP
);

-- ── Indexes for scale ──────────────────────────────────────────────────────────

-- Primary browse query: live feed sorted by newest
CREATE INDEX idx_opp_status_created
    ON opportunities (status, created_at DESC);

-- Browse with type filter (most common filter combo)
CREATE INDEX idx_opp_status_type_created
    ON opportunities (status, type, created_at DESC);

-- Expiry job: find LIVE rows past their expiry
CREATE INDEX idx_opp_status_expires
    ON opportunities (status, expires_at)
    WHERE status = 'LIVE';

-- Admin moderation queue: pending only (partial index — small and fast)
CREATE INDEX idx_opp_pending
    ON opportunities (created_at DESC)
    WHERE status = 'PENDING';

-- Company filter
CREATE INDEX idx_opp_company
    ON opportunities (company_id)
    WHERE company_id IS NOT NULL;

-- "My posts" query per user
CREATE INDEX idx_opp_posted_by
    ON opportunities (posted_by, created_at DESC);

-- Location filter
CREATE INDEX idx_opp_location
    ON opportunities (location, status, created_at DESC)
    WHERE location IS NOT NULL;
