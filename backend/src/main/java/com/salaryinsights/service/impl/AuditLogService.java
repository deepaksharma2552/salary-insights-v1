package com.salaryinsights.service.impl;

import com.salaryinsights.dto.response.CursorPage;
import com.salaryinsights.entity.AuditLog;
import com.salaryinsights.repository.AuditLogRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    private static final DateTimeFormatter CURSOR_FMT =
            DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    // ── Write ──────────────────────────────────────────────────────────────────

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
            log.error("[AuditLog] Failed to persist audit entry: entityType={} entityId={} action={} error={}",
                    entityType, entityId, action, e.getMessage(), e);
        }
    }

    // ── Read ───────────────────────────────────────────────────────────────────

    /**
     * Returns a page of audit logs.
     *
     * Strategy:
     *  - No filters + no cursor  → fast keyset query, no COUNT, Slice
     *  - No filters + cursor     → fast keyset query, no COUNT, Slice
     *  - Any filter active       → Specification-based query (Page with COUNT)
     *    At filtered volumes the result set is small so COUNT is acceptable.
     *
     * This avoids the Hibernate null-param JPQL issue entirely by never
     * passing null into a JPQL IS NULL check.
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

        String actionFilter     = blankToNull(action);
        String performerFilter  = blankToNull(performedBy);
        String entityTypeFilter = blankToNull(entityType);

        boolean hasFilters = actionFilter != null || performerFilter != null
                || entityTypeFilter != null || from != null || to != null;

        if (!hasFilters) {
            // ── Fast path: no filters — pure keyset, no COUNT ──────────────
            PageRequest pageable = PageRequest.of(0, safeSize);
            Slice<AuditLog> slice;

            if (cursor == null || cursor.isBlank()) {
                slice = auditLogRepository.findFirstPageNoCursor(pageable);
            } else {
                LocalDateTime cursorTs = LocalDateTime.parse(cursor, CURSOR_FMT);
                slice = auditLogRepository.findNextPageNoCursor(cursorTs, pageable);
            }

            return CursorPage.of(
                    slice,
                    entry -> entry,
                    entry -> entry.getCreatedAt().format(CURSOR_FMT)
            );
        }

        // ── Filtered path: build Specification dynamically ─────────────────
        // Add cursor as an extra predicate when present.
        final String cursorFilter = (cursor != null && !cursor.isBlank()) ? cursor : null;

        Specification<AuditLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (cursorFilter != null) {
                LocalDateTime cursorTs = LocalDateTime.parse(cursorFilter, CURSOR_FMT);
                predicates.add(cb.lessThan(root.get("createdAt"), cursorTs));
            }
            if (actionFilter != null) {
                predicates.add(cb.equal(root.get("action"), actionFilter));
            }
            if (performerFilter != null) {
                predicates.add(cb.equal(root.get("performedBy"), performerFilter));
            }
            if (entityTypeFilter != null) {
                predicates.add(cb.equal(root.get("entityType"), entityTypeFilter));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        PageRequest pageable = PageRequest.of(
                0, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AuditLog> page = auditLogRepository.findAll(spec, pageable);

        // Wrap Page as a Slice-compatible CursorPage
        boolean hasMore = page.hasNext();
        List<AuditLog> content = page.getContent();
        String nextCursor = (hasMore && !content.isEmpty())
                ? content.get(content.size() - 1).getCreatedAt().format(CURSOR_FMT)
                : null;

        return CursorPage.<AuditLog>builder()
                .content(content)
                .nextCursor(nextCursor)
                .hasMore(hasMore)
                .size(content.size())
                .build();
    }

    // ── Archival ───────────────────────────────────────────────────────────────

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
