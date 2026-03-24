package com.salaryinsights.controller;

import com.salaryinsights.dto.response.ApiResponse;
import com.salaryinsights.service.impl.PageViewService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Admin-only analytics endpoints.
 * All reads from page_view_daily — fast at any scale.
 */
@RestController
@RequestMapping("/admin/analytics")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminAnalyticsController {

    private final PageViewService pageViewService;

    /**
     * GET /admin/analytics/pages?from=2026-03-01&to=2026-03-23
     * Returns views + unique sessions per page for the given date range.
     */
    @GetMapping("/pages")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getPageStats(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(ApiResponse.success(pageViewService.getPageStats(from, to)));
    }

    /**
     * GET /admin/analytics/daily?from=2026-03-01&to=2026-03-23
     * Returns daily total views + unique sessions — for the trend chart.
     */
    @GetMapping("/daily")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getDailyTotals(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(ApiResponse.success(pageViewService.getDailyTotals(from, to)));
    }

    /**
     * POST /admin/analytics/aggregate
     * Manually triggers the hourly aggregation job — useful immediately after
     * deploy or when verifying tracking is working without waiting up to 1 hour.
     * Idempotent: safe to call multiple times.
     */
    @PostMapping("/aggregate")
    public ResponseEntity<ApiResponse<String>> triggerAggregation() {
        pageViewService.aggregateHourly();
        return ResponseEntity.ok(ApiResponse.success("Aggregation complete"));
    }
}
