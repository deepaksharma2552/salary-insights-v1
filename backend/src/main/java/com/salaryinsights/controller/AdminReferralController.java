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
     * Use ?paused=true to see ACCEPTED referrals that are currently hidden from the public board.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<ReferralResponse>>> getAll(
            @RequestParam(required = false) ReferralStatus status,
            @RequestParam(required = false) Boolean paused,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "50") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(
                ApiResponse.success(referralService.getAllReferrals(status, paused, pageable)));
    }

    /**
     * PATCH /admin/referrals/{id}/toggle-active
     * Pause (hide from public board) or reactivate an ACCEPTED referral.
     * Does not change the referral's ACCEPTED status — purely a visibility toggle.
     */
    @PatchMapping("/{id}/toggle-active")
    public ResponseEntity<ApiResponse<ReferralResponse>> toggleActive(@PathVariable UUID id) {
        ReferralResponse response = referralService.toggleActive(id);
        String msg = response.isActive() ? "Referral reactivated" : "Referral paused";
        return ResponseEntity.ok(ApiResponse.success(msg, response));
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
