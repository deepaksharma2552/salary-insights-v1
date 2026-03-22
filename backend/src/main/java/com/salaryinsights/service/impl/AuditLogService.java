package com.salaryinsights.service.impl;

import com.salaryinsights.dto.response.CursorPage;
import com.salaryinsights.entity.AuditLog;
import com.salaryinsights.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    private static final DateTimeFormatter CURSOR_FMT =
            DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    // ── Write — bounded async executor, never drops a log ─────────────────────

    /**
     * Persists an audit log entry asynchronously on the "auditExecutor" thread pool.
     * CallerRunsPolicy on the executor ensures this falls back to synchronous
     * execution under extreme load rather than silently dropping the log.
     */
    @Async("auditExecutor")
    public void log(String entityType, String entityId, String action, String details) {
        try {
            String performedBy = getCurrentUser();
            AuditLog entry = AuditLog.builder()
                    .entityType(entityType)
                    .entityId(entityId)
                    .action(action)
                    .performedBy(performedBy)
                    .details(details)
                    .build();
            auditLogRepository.save(entry);
        } catch (Exception e) {
            // Never let an audit write failure bubble up to the caller —
            // log it loudly here but do not rethrow.
            log.error("[AuditLog] Failed to persist audit entry: entityType={} entityId={} action={} error={}",
                    entityType, entityId, action, e.getMessage(), e);
        }
    }

    // ── Read — cursor-based, no COUNT(*) ──────────────────────────────────────

    /**
     * Returns a page of audit logs using keyset (cursor) pagination.
     * No COUNT(*) is ever fired — stays fast at any row count.
     *
     * @param cursor      ISO-8601 createdAt of the last seen row (null = first page)
     * @param size        page size (capped at 100 server-side)
     * @param action      optional exact-match filter on action string
     * @param performedBy optional exact-match filter on performer
     * @param entityType  optional exact-match filter on entity type
     * @param from        optional inclusive lower bound on createdAt
     * @param to          optional inclusive upper bound on createdAt
     */
    public CursorPage<AuditLog> getLogs(
            String cursor,
            int size,
            String action,
            String performedBy,
            String entityType,
            LocalDateTime from,
            LocalDateTime to
    ) {
        int safeSize = Math.min(size, 100);
        PageRequest pageable = PageRequest.of(0, safeSize);

        String actionFilter     = blankToNull(action);
        String performerFilter  = blankToNull(performedBy);
        String entityTypeFilter = blankToNull(entityType);

        Slice<AuditLog> slice;
        if (cursor == null || cursor.isBlank()) {
            slice = auditLogRepository.findFirstPage(
                    actionFilter, performerFilter, entityTypeFilter, from, to, pageable);
        } else {
            LocalDateTime cursorTs = LocalDateTime.parse(cursor, CURSOR_FMT);
            slice = auditLogRepository.findNextPage(
                    cursorTs, actionFilter, performerFilter, entityTypeFilter, from, to, pageable);
        }

        return CursorPage.of(
                slice,
                entry -> entry,
                entry -> entry.getCreatedAt().format(CURSOR_FMT)
        );
    }

    // ── Archival — called by AuditLogArchivalJob only ─────────────────────────

    /**
     * Moves audit logs older than the given cutoff to audit_logs_archive
     * in a single native batch. Returns the number of rows archived.
     *
     * Runs inside its own transaction — if it fails, nothing is
     * partially committed and the job will retry on the next run.
     */
    @Transactional
    public int archiveBefore(LocalDateTime cutoff, int batchSize) {
        int archived = auditLogRepository.archiveBatch(cutoff, batchSize);
        if (archived > 0) {
            log.info("[AuditLog] Archived {} rows older than {}", archived, cutoff);
        }
        return archived;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : "system";
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }
}
