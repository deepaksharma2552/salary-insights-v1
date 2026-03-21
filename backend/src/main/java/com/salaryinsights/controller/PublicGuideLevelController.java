package com.salaryinsights.controller;

import com.salaryinsights.dto.response.*;
import com.salaryinsights.service.impl.GuideLevelService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/public/guide-levels")
@RequiredArgsConstructor
public class PublicGuideLevelController {

    private final GuideLevelService service;

    /**
     * All standard levels — used by frontend to populate the company selector
     * and to know which standard levels exist.
     */
    @GetMapping("/standard")
    public ResponseEntity<ApiResponse<List<GuideStandardLevelResponse>>> getStandardLevels() {
        return ResponseEntity.ok(ApiResponse.success(service.getAllStandardLevels()));
    }

    /**
     * Comparison grid for selected companies.
     * ?companyIds=uuid1&companyIds=uuid2&functionCategory=Engineering
     * functionCategory is optional — omit or pass "All" to show every function track.
     * Up to 5 companies, capped server-side. Returns only standard levels that have
     * at least one mapping across the selected companies — no empty rows.
     */
    @GetMapping("/grid")
    public ResponseEntity<ApiResponse<GuideLevelGridResponse>> getGrid(
            @RequestParam(required = false) List<UUID> companyIds,
            @RequestParam(required = false) String functionCategory) {
        if (companyIds == null || companyIds.isEmpty()) {
            GuideLevelGridResponse empty = new GuideLevelGridResponse();
            empty.setStandardLevels(java.util.List.of());
            empty.setCompanies(java.util.List.of());
            empty.setGrid(java.util.Map.of());
            return ResponseEntity.ok(ApiResponse.success(empty));
        }
        return ResponseEntity.ok(ApiResponse.success(service.buildGrid(companyIds, functionCategory)));
    }
}
