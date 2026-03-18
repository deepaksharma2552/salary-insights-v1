-- V10__referrals_expiry.sql
-- Add expires_at column to referrals table.
-- Existing rows default to 30 days from their creation date.

ALTER TABLE referrals
    ADD COLUMN expires_at TIMESTAMP;

UPDATE referrals
    SET expires_at = created_at + INTERVAL '30 days'
    WHERE expires_at IS NULL;

ALTER TABLE referrals
    ALTER COLUMN expires_at SET NOT NULL;

CREATE INDEX idx_referral_expires ON referrals(expires_at);
