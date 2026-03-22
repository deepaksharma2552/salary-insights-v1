package com.salaryinsights.controller;

import com.salaryinsights.dto.request.OpportunityStatusRequest;
import com.salaryinsights.dto.response.ApiResponse;
import com.salaryinsights.dto.response.OpportunityResponse;
import com.salaryinsights.dto.response.PagedResponse;
import com.salaryinsights.service.impl.OpportunityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/admin/opportunities")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminOpportunityController {

    private final OpportunityService opportunityService;

    /**
     * GET /admin/opportunities/pending
     * Moderation queue — oldest first so admins clear the backlog in order.
     */
    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<PagedResponse<OpportunityResponse>>> getPending(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(opportunityService.getPending(page, size)));
    }

    /**
     * GET /admin/opportunities
     * All opportunities, optionally filtered by status.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<OpportunityResponse>>> getAll(
            @RequestParam(defaultValue = "0")  int    page,
            @RequestParam(defaultValue = "20") int    size,
            @RequestParam(required = false)    String status
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                opportunityService.getAll(page, size, status)));
    }

    /**
     * PATCH /admin/opportunities/{id}/status
     * Approve (LIVE) or reject (REJECTED) a pending opportunity.
     * Rejection requires a rejectionReason.
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<OpportunityResponse>> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody OpportunityStatusRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Status updated", opportunityService.updateStatus(id, request)));
    }

    /**
     * DELETE /admin/opportunities/{id}
     * Hard delete — use sparingly. Prefer REJECT for moderation.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        opportunityService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Deleted", null));
    }
}
