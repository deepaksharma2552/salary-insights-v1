-- V9__referrals.sql
-- Referral opportunity links — users share job referral links, admins approve before publishing

CREATE TABLE referrals (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    referred_by_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id       UUID        REFERENCES companies(id) ON DELETE SET NULL,
    company_name_raw VARCHAR(255),          -- used when company was auto-created or typed free-text
    referral_link    TEXT        NOT NULL,  -- the actual referral / job application URL
    status           VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    admin_note       VARCHAR(500),          -- optional rejection reason from admin
    created_at       TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP
);

CREATE INDEX idx_referral_user    ON referrals(referred_by_id);
CREATE INDEX idx_referral_status  ON referrals(status);
CREATE INDEX idx_referral_created ON referrals(created_at DESC);
