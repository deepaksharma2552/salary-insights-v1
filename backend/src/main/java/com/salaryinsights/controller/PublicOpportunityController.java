package com.salaryinsights.controller;

import com.salaryinsights.dto.request.OpportunityRequest;
import com.salaryinsights.dto.response.ApiResponse;
import com.salaryinsights.dto.response.CursorPage;
import com.salaryinsights.dto.response.OpportunityResponse;
import com.salaryinsights.dto.response.PagedResponse;
import com.salaryinsights.service.impl.OpportunityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/public/opportunities")
@RequiredArgsConstructor
public class PublicOpportunityController {

    private final OpportunityService opportunityService;

    /**
     * GET /public/opportunities
     * Browse live opportunities — no auth required.
     * Cursor-based pagination, optional filters.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<CursorPage<OpportunityResponse>>> getLive(
            @RequestParam(required = false)                String cursor,
            @RequestParam(defaultValue = "20")             int    size,
            @RequestParam(required = false)                String type,
            @RequestParam(required = false)                String location,
            @RequestParam(required = false)                String workMode
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                opportunityService.getLive(cursor, size, type, location, workMode)));
    }

    /**
     * GET /public/opportunities/counts
     * Returns live opportunity counts grouped by type.
     * Used by homepage cards — no auth required.
     * Cached via analytics cache (evicted on any opportunity approval).
     */
    @GetMapping("/counts")
    public ResponseEntity<ApiResponse<java.util.Map<String, Long>>> getCounts() {
        return ResponseEntity.ok(ApiResponse.success(opportunityService.getCountsByType()));
    }

    /**
     * POST /public/opportunities
     * Submit a new opportunity — auth required, goes to PENDING.
     */
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<OpportunityResponse>> post(
            @Valid @RequestBody OpportunityRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Opportunity submitted for review", opportunityService.post(request)));
    }

    /**
     * GET /public/opportunities/my
     * Returns the calling user's own posts (all statuses).
     */
    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PagedResponse<OpportunityResponse>>> getMyPosts(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(opportunityService.getMyPosts(page, size)));
    }
}
