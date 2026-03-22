package com.salaryinsights.repository;

import com.salaryinsights.entity.AuditLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    // ── First page (no cursor) ─────────────────────────────────────────────────

    @Query("""
        SELECT a FROM AuditLog a
        WHERE (:action       IS NULL OR a.action      = :action)
          AND (:performedBy  IS NULL OR a.performedBy = :performedBy)
          AND (:entityType   IS NULL OR a.entityType  = :entityType)
          AND (:from         IS NULL OR a.createdAt  >= :from)
          AND (:to           IS NULL OR a.createdAt  <= :to)
        ORDER BY a.createdAt DESC
        """)
    Slice<AuditLog> findFirstPage(
            @Param("action")      String action,
            @Param("performedBy") String performedBy,
            @Param("entityType")  String entityType,
            @Param("from")        LocalDateTime from,
            @Param("to")          LocalDateTime to,
            Pageable pageable
    );

    // ── Subsequent pages (keyset — cursor is the createdAt of the last row) ───

    @Query("""
        SELECT a FROM AuditLog a
        WHERE a.createdAt < :cursor
          AND (:action       IS NULL OR a.action      = :action)
          AND (:performedBy  IS NULL OR a.performedBy = :performedBy)
          AND (:entityType   IS NULL OR a.entityType  = :entityType)
          AND (:from         IS NULL OR a.createdAt  >= :from)
          AND (:to           IS NULL OR a.createdAt  <= :to)
        ORDER BY a.createdAt DESC
        """)
    Slice<AuditLog> findNextPage(
            @Param("cursor")      LocalDateTime cursor,
            @Param("action")      String action,
            @Param("performedBy") String performedBy,
            @Param("entityType")  String entityType,
            @Param("from")        LocalDateTime from,
            @Param("to")          LocalDateTime to,
            Pageable pageable
    );

    // ── Archival ───────────────────────────────────────────────────────────────

    /**
     * Copies rows older than :cutoff into audit_logs_archive then deletes them
     * from the live table — all in one atomic CTE. LIMIT caps lock duration.
     * Requires the archive table created by V19__audit_log_archive.sql.
     * Returns the number of rows moved.
     */
    @Modifying
    @Query(value = """
        WITH moved AS (
            DELETE FROM audit_logs
            WHERE id IN (
                SELECT id FROM audit_logs
                WHERE created_at < :cutoff
                ORDER BY created_at ASC
                LIMIT :batchSize
            )
            RETURNING *
        )
        INSERT INTO audit_logs_archive
            (id, entity_type, entity_id, action, performed_by, details, created_at)
        SELECT id, entity_type, entity_id, action, performed_by, details, created_at
        FROM moved
        """, nativeQuery = true)
    int archiveBatch(
            @Param("cutoff")    LocalDateTime cutoff,
            @Param("batchSize") int batchSize
    );
}
