package com.salaryinsights.repository;

import com.salaryinsights.entity.AuditLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.UUID;

@Repository
public interface AuditLogRepository
        extends JpaRepository<AuditLog, UUID>,
                JpaSpecificationExecutor<AuditLog> {

    // ── Keyset: first page (no cursor) ────────────────────────────────────────

    @Query("SELECT a FROM AuditLog a ORDER BY a.createdAt DESC")
    Slice<AuditLog> findFirstPageNoCursor(Pageable pageable);

    // ── Keyset: next page (cursor = createdAt of last seen row) ───────────────

    @Query("SELECT a FROM AuditLog a WHERE a.createdAt < :cursor ORDER BY a.createdAt DESC")
    Slice<AuditLog> findNextPageNoCursor(
            @Param("cursor") LocalDateTime cursor,
            Pageable pageable
    );

    // ── Keyset + filters ──────────────────────────────────────────────────────
    // Built dynamically in AuditLogService via Specification — no JPQL needed.
    // JpaSpecificationExecutor.findAll(Specification, Pageable) returns a Page
    // (with COUNT). We use the Slice variant below instead.

    // Spring Data does not expose findAll(Specification, Pageable) → Slice directly,
    // so we use the Page variant and accept one COUNT query when filters are active.
    // At filtered volumes the result set is small enough that COUNT is cheap.

    // ── Archival ───────────────────────────────────────────────────────────────

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
