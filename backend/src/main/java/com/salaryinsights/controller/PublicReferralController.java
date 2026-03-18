package com.salaryinsights.controller;

import com.salaryinsights.dto.response.ApiResponse;
import com.salaryinsights.dto.response.PagedResponse;
import com.salaryinsights.dto.response.ReferralResponse;
import com.salaryinsights.service.impl.ReferralService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/public/referrals")
@RequiredArgsConstructor
public class PublicReferralController {

    private final ReferralService referralService;

    /**
     * GET /public/referrals
     * Returns all ACCEPTED referrals — no auth required.
     * This is what the public "View Referrals" page calls.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<ReferralResponse>>> getAccepted(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "50") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(
                ApiResponse.success(referralService.getAcceptedReferrals(pageable)));
    }
}
