-- V19__audit_log_archive.sql
--
-- Creates the audit_logs_archive table that receives rows moved out of the
-- live audit_logs table by the AuditLogArchivalJob.
--
-- Deliberately has NO indexes (other than PK) — the archive is write-heavy
-- and rarely queried. If you need to search the archive occasionally, add
-- indexes then. For now, keep writes fast.
--
-- The archive table has the same columns as audit_logs so the CTE INSERT
-- in AuditLogRepository.archiveBatch() needs no mapping.

CREATE TABLE IF NOT EXISTS audit_logs_archive (
    id           UUID         NOT NULL,
    entity_type  VARCHAR(100) NOT NULL,
    entity_id    VARCHAR(100),
    action       VARCHAR(50)  NOT NULL,
    performed_by VARCHAR(255),
    details      TEXT,
    created_at   TIMESTAMP    NOT NULL,

    CONSTRAINT pk_audit_logs_archive PRIMARY KEY (id)
);

-- One index on created_at for the rare case of querying old archives by date.
-- Not needed for archival writes but cheap to have.
CREATE INDEX IF NOT EXISTS idx_archive_created_at
    ON audit_logs_archive (created_at DESC);

COMMENT ON TABLE audit_logs_archive IS
    'Cold storage for audit_logs rows older than the archival threshold. '
    'Written by AuditLogArchivalJob. Queryable but not indexed heavily.';
