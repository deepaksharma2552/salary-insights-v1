package com.salaryinsights.controller;

import com.salaryinsights.dto.request.*;
import com.salaryinsights.dto.response.*;
import com.salaryinsights.service.impl.GuideLevelService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/admin/guide-levels")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminGuideLevelController {

    private final GuideLevelService service;

    // ── Standard Levels ───────────────────────────────────────────────────────

    @GetMapping("/standard")
    public ResponseEntity<ApiResponse<List<GuideStandardLevelResponse>>> getStandardLevels() {
        return ResponseEntity.ok(ApiResponse.success(service.getAllStandardLevels()));
    }

    @PostMapping("/standard")
    public ResponseEntity<ApiResponse<GuideStandardLevelResponse>> createStandardLevel(
            @Valid @RequestBody GuideStandardLevelRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Created", service.createStandardLevel(req)));
    }

    @PutMapping("/standard/{id}")
    public ResponseEntity<ApiResponse<GuideStandardLevelResponse>> updateStandardLevel(
            @PathVariable UUID id, @Valid @RequestBody GuideStandardLevelRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Updated", service.updateStandardLevel(id, req)));
    }

    @DeleteMapping("/standard/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteStandardLevel(@PathVariable UUID id) {
        service.deleteStandardLevel(id);
        return ResponseEntity.ok(ApiResponse.success("Deleted", null));
    }

    // ── Company Levels ────────────────────────────────────────────────────────

    @GetMapping("/company/{companyId}")
    public ResponseEntity<ApiResponse<List<GuideCompanyLevelResponse>>> getCompanyLevels(
            @PathVariable UUID companyId) {
        return ResponseEntity.ok(ApiResponse.success(service.getCompanyLevels(companyId)));
    }

    @PostMapping("/company")
    public ResponseEntity<ApiResponse<GuideCompanyLevelResponse>> createCompanyLevel(
            @Valid @RequestBody GuideCompanyLevelRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Created", service.createCompanyLevel(req)));
    }

    @DeleteMapping("/company/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCompanyLevel(@PathVariable UUID id) {
        service.deleteCompanyLevel(id);
        return ResponseEntity.ok(ApiResponse.success("Deleted", null));
    }

    // ── Mappings ──────────────────────────────────────────────────────────────

    @PostMapping("/mappings")
    public ResponseEntity<ApiResponse<GuideCompanyLevelResponse>> upsertMapping(
            @Valid @RequestBody GuideMappingRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Mapped", service.upsertMapping(req)));
    }

    @DeleteMapping("/mappings/company-level/{guideCompanyLevelId}")
    public ResponseEntity<ApiResponse<Void>> deleteMapping(@PathVariable UUID guideCompanyLevelId) {
        service.deleteMapping(guideCompanyLevelId);
        return ResponseEntity.ok(ApiResponse.success("Mapping removed", null));
    }
}
