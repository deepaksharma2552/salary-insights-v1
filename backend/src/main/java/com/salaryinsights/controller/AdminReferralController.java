package com.salaryinsights.controller;

import com.salaryinsights.dto.request.ReferralStatusRequest;
import com.salaryinsights.dto.response.ApiResponse;
import com.salaryinsights.dto.response.PagedResponse;
import com.salaryinsights.dto.response.ReferralResponse;
import com.salaryinsights.enums.ReferralStatus;
import com.salaryinsights.service.impl.ReferralService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/admin/referrals")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminReferralController {

    private final ReferralService referralService;

    /**
     * GET /admin/referrals
     * All referrals, optionally filtered by status.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<ReferralResponse>>> getAll(
            @RequestParam(required = false) ReferralStatus status,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(
                ApiResponse.success(referralService.getAllReferrals(status, pageable)));
    }

    /**
     * PATCH /admin/referrals/{id}/status
     * Accept or reject a referral. Body: { status: "ACCEPTED"|"REJECTED", adminNote: "..." }
     * Only PENDING referrals can be actioned — service enforces this.
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<ReferralResponse>> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody ReferralStatusRequest request) {
        ReferralResponse response = referralService.updateStatus(id, request);
        return ResponseEntity.ok(
                ApiResponse.success("Referral status updated to " + request.getStatus(), response));
    }
}
