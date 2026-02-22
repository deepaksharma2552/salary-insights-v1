package com.salaryinsights.controller;

import com.salaryinsights.dto.response.AiRefreshResult;
import com.salaryinsights.dto.response.ApiResponse;
import com.salaryinsights.service.ai.AiRefreshService;
import com.salaryinsights.service.ai.AiUnavailableException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Admin-only AI refresh endpoints.
 *
 * POST /api/admin/ai/refresh             → refresh all active companies
 * POST /api/admin/ai/refresh/{companyId} → refresh one specific company
 */
@Slf4j
@RestController
@RequestMapping("/admin/ai")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminAiController {

    private final AiRefreshService aiRefreshService;

    /**
     * Refresh salary data for ALL active companies using AI.
     */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AiRefreshResult>> refreshAll() {
        log.info("[AdminAi] Refresh all triggered by admin");
        try {
            AiRefreshResult result = aiRefreshService.refreshAll();
            return ResponseEntity.ok(ApiResponse.success("AI refresh complete", result));
        } catch (AiUnavailableException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(ApiResponse.error("AI service unavailable: " + e.getMessage()));
        }
    }

    /**
     * Refresh salary data for a SINGLE company using AI.
     */
    @PostMapping("/refresh/{companyId}")
    public ResponseEntity<ApiResponse<AiRefreshResult>> refreshOne(@PathVariable UUID companyId) {
        log.info("[AdminAi] Single-company refresh triggered for: {}", companyId);
        try {
            AiRefreshResult result = aiRefreshService.refreshOne(companyId);
            return ResponseEntity.ok(ApiResponse.success("AI refresh complete", result));
        } catch (AiUnavailableException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(ApiResponse.error("AI service unavailable: " + e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }
}
