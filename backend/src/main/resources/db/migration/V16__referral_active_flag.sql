-- V16__referral_active_flag.sql
-- Adds an `active` flag to referrals so admins can temporarily hide
-- an ACCEPTED referral from the public board without permanently rejecting it.
-- All existing rows default to true — no data migration needed.

ALTER TABLE referrals
    ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_referral_active ON referrals(active);
