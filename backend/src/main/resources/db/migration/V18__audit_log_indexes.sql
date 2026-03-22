-- V18__audit_log_indexes.sql
-- Adds a DESC index on created_at so every audit log page query uses
-- an index scan instead of a full-table sort.
-- Also adds a composite index for the common (action + created_at) filter
-- pattern and one for (performed_by + created_at) range queries.

CREATE INDEX IF NOT EXISTS idx_audit_created_at
    ON audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_action_created_at
    ON audit_logs (action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_performer_created_at
    ON audit_logs (performed_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_entity_type_created_at
    ON audit_logs (entity_type, created_at DESC);
