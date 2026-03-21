package com.salaryinsights.controller;

import com.salaryinsights.dto.response.*;
import com.salaryinsights.dto.request.LaunchpadExperienceRequest;
import com.salaryinsights.enums.LaunchpadRoundType;
import com.salaryinsights.service.impl.LaunchpadService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/public/launchpad")
@RequiredArgsConstructor
public class PublicLaunchpadController {

    private final LaunchpadService launchpadService;

    /** All active resources — cached 6hr, browser cached 1hr. */
    @GetMapping("/resources")
    public ResponseEntity<ApiResponse<List<LaunchpadResourceResponse>>> getResources(
            HttpServletResponse response) {
        response.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
        return ResponseEntity.ok(ApiResponse.success(launchpadService.getAllActiveResources()));
    }

    /** Landing page stats — cached 30min. */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<LaunchpadStatsResponse>> getStats(
            HttpServletResponse response) {
        response.setHeader("Cache-Control", "public, max-age=1800");
        return ResponseEntity.ok(ApiResponse.success(launchpadService.getStats()));
    }

    /**
     * Experiences with cursor-based pagination.
     * Hot path (no filters, first page) served from Caffeine cache.
     * Cache-Control: short TTL since new experiences get approved regularly.
     */
    @GetMapping("/experiences")
    public ResponseEntity<ApiResponse<CursorPage<LaunchpadExperienceResponse>>> getExperiences(
            @RequestParam(required = false) UUID companyId,
            @RequestParam(required = false) LaunchpadRoundType roundType,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String cursor,
            HttpServletResponse response) {
        // Only cache unfiltered first-page requests at HTTP layer
        if (companyId == null && roundType == null && (search == null || search.isBlank()) && cursor == null) {
            response.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
        } else {
            response.setHeader("Cache-Control", "private, no-cache");
        }
        CursorPage<LaunchpadExperienceResponse> page =
                launchpadService.getPublicExperiences(companyId, roundType, search, cursor);
        return ResponseEntity.ok(ApiResponse.success(page));
    }

    /** Submit an interview experience — requires authentication. */
    @PostMapping("/experiences")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<LaunchpadExperienceResponse>> submitExperience(
            @Valid @RequestBody LaunchpadExperienceRequest req) {
        return ResponseEntity.status(201)
                .body(ApiResponse.success("Experience submitted for review",
                        launchpadService.submitExperience(req)));
    }
}
