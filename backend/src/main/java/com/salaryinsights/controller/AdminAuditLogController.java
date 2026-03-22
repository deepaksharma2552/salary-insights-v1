package com.salaryinsights.controller;

import com.salaryinsights.dto.response.ApiResponse;
import com.salaryinsights.dto.response.CursorPage;
import com.salaryinsights.entity.AuditLog;
import com.salaryinsights.service.impl.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/admin/audit-logs")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminAuditLogController {

    private final AuditLogService auditLogService;

    /**
     * GET /admin/audit-logs
     *
     * Query params:
     *   cursor      — ISO-8601 createdAt of last seen row (omit for first page)
     *   size        — page size, default 20, max 100
     *   action      — APPROVE | REJECT | CREATE | UPDATE | DELETE (optional)
     *   performedBy — admin email/name exact match (optional)
     *   entityType  — SALARY | COMPANY | etc. (optional)
     *   from        — ISO datetime, inclusive lower bound (optional)
     *   to          — ISO datetime, inclusive upper bound (optional)
     *
     * Response: CursorPage with hasMore + nextCursor for the next request.
     * No COUNT(*) is fired — safe at any row count.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<CursorPage<AuditLog>>> getAuditLogs(
            @RequestParam(required = false)                                       String cursor,
            @RequestParam(defaultValue = "20")                                    int    size,
            @RequestParam(required = false)                                       String action,
            @RequestParam(required = false)                                       String performedBy,
            @RequestParam(required = false)                                       String entityType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to
    ) {
        CursorPage<AuditLog> page = auditLogService.getLogs(
                cursor, size, action, performedBy, entityType, from, to);
        return ResponseEntity.ok(ApiResponse.success(page));
    }
}
