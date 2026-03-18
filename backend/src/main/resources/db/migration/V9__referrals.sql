-- V9__referrals.sql
-- Referral submissions — users refer candidates, admins accept or reject

CREATE TABLE referrals (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    referred_by_id   UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    candidate_name   VARCHAR(200) NOT NULL,
    candidate_email  VARCHAR(255) NOT NULL,
    job_title        VARCHAR(200),
    company_id       UUID         REFERENCES companies(id) ON DELETE SET NULL,
    company_name_raw VARCHAR(255),          -- free-text fallback when company not in system
    note             TEXT,
    status           VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    admin_note       VARCHAR(500),          -- optional rejection reason from admin
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP
);

CREATE INDEX idx_referral_user   ON referrals(referred_by_id);
CREATE INDEX idx_referral_status ON referrals(status);
CREATE INDEX idx_referral_created ON referrals(created_at DESC);
