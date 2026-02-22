package com.salaryinsights.controller;

import com.salaryinsights.dto.request.*;
import com.salaryinsights.dto.response.*;
import com.salaryinsights.entity.AuditLog;
import com.salaryinsights.service.impl.AuditLogService;
import com.salaryinsights.service.impl.LevelMappingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/admin/levels")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminLevelController {

    private final LevelMappingService levelMappingService;
    private final AuditLogService auditLogService;

    // Standardized Levels
    @GetMapping("/standardized")
    public ResponseEntity<ApiResponse<List<StandardizedLevelResponse>>> getStandardizedLevels() {
        return ResponseEntity.ok(ApiResponse.success(levelMappingService.getAllStandardizedLevels()));
    }

    @PostMapping("/standardized")
    public ResponseEntity<ApiResponse<StandardizedLevelResponse>> createStandardizedLevel(
            @Valid @RequestBody StandardizedLevelRequest request) {
        StandardizedLevelResponse response = levelMappingService.createStandardizedLevel(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Created", response));
    }

    @PutMapping("/standardized/{id}")
    public ResponseEntity<ApiResponse<StandardizedLevelResponse>> updateStandardizedLevel(
            @PathVariable UUID id, @Valid @RequestBody StandardizedLevelRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Updated",
                levelMappingService.updateStandardizedLevel(id, request)));
    }

    @DeleteMapping("/standardized/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteStandardizedLevel(@PathVariable UUID id) {
        levelMappingService.deleteStandardizedLevel(id);
        return ResponseEntity.ok(ApiResponse.success("Deleted", null));
    }

    // Company Levels
    @GetMapping("/company/{companyId}")
    public ResponseEntity<ApiResponse<List<CompanyLevelResponse>>> getCompanyLevels(@PathVariable UUID companyId) {
        return ResponseEntity.ok(ApiResponse.success(levelMappingService.getCompanyLevels(companyId)));
    }

    @PostMapping("/company")
    public ResponseEntity<ApiResponse<CompanyLevelResponse>> createCompanyLevel(
            @Valid @RequestBody CompanyLevelRequest request) {
        CompanyLevelResponse response = levelMappingService.createCompanyLevel(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Created", response));
    }

    @DeleteMapping("/company/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCompanyLevel(@PathVariable UUID id) {
        levelMappingService.deleteCompanyLevel(id);
        return ResponseEntity.ok(ApiResponse.success("Deleted", null));
    }

    // Mappings
    @PostMapping("/mappings")
    public ResponseEntity<ApiResponse<CompanyLevelResponse>> createMapping(
            @Valid @RequestBody LevelMappingRequest request) {
        CompanyLevelResponse response = levelMappingService.createOrUpdateMapping(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Mapped", response));
    }

    @DeleteMapping("/mappings/company-level/{companyLevelId}")
    public ResponseEntity<ApiResponse<Void>> deleteMapping(@PathVariable UUID companyLevelId) {
        levelMappingService.deleteMapping(companyLevelId);
        return ResponseEntity.ok(ApiResponse.success("Mapping removed", null));
    }

    // Audit Logs
    @GetMapping("/audit-logs")
    public ResponseEntity<ApiResponse<PagedResponse<AuditLog>>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String entityType) {

        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<AuditLog> logs = entityType != null
                ? auditLogService.getLogsByEntityType(entityType, pageable)
                : auditLogService.getAllLogs(pageable);

        return ResponseEntity.ok(ApiResponse.success(PagedResponse.of(logs)));
    }
}
