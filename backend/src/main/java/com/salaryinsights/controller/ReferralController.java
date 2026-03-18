package com.salaryinsights.controller;

import com.salaryinsights.dto.request.ReferralRequest;
import com.salaryinsights.dto.response.ApiResponse;
import com.salaryinsights.dto.response.PagedResponse;
import com.salaryinsights.dto.response.ReferralResponse;
import com.salaryinsights.service.impl.ReferralService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/referrals")
@RequiredArgsConstructor
public class ReferralController {

    private final ReferralService referralService;

    /**
     * POST /referrals
     * Submit a new referral. Authenticated users only.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<ReferralResponse>> submit(
            @Valid @RequestBody ReferralRequest request) {
        ReferralResponse response = referralService.submit(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Referral submitted successfully", response));
    }

    /**
     * GET /referrals/mine
     * Returns all referrals submitted by the calling user — reads JWT principal,
     * so no user ID is exposed in the URL (prevents enumeration).
     */
    @GetMapping("/mine")
    public ResponseEntity<ApiResponse<PagedResponse<ReferralResponse>>> getMyReferrals(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.success(referralService.getMyReferrals(pageable)));
    }
}
