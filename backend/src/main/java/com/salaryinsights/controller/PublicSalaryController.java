package com.salaryinsights.controller;

import com.salaryinsights.dto.response.*;
import com.salaryinsights.service.impl.SalaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/public/salaries")
@RequiredArgsConstructor
public class PublicSalaryController {

    private final SalaryService salaryService;

    /**
     * GET /public/salaries
     * Supports multiselect: ?location=Bengaluru&location=Pune&experienceLevel=SENIOR&experienceLevel=LEAD
     * Single values work identically — Spring binds List<String> from repeated params.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<SalaryResponse>>> getSalaries(
            @RequestParam(required = false) UUID companyId,
            @RequestParam(required = false) String companyName,
            @RequestParam(required = false) String jobTitle,
            @RequestParam(required = false) List<String> location,
            @RequestParam(required = false) List<String> experienceLevel,
            @RequestParam(required = false) String employmentType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        PagedResponse<SalaryResponse> data = salaryService.getApprovedSalaries(
                companyId, companyName, jobTitle, location, experienceLevel, employmentType, pageable);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SalaryResponse>> getSalaryById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(salaryService.getSalaryById(id)));
    }

    @GetMapping("/analytics/by-location")
    public ResponseEntity<ApiResponse<List<SalaryAggregationDTO>>> getByLocation() {
        return ResponseEntity.ok(ApiResponse.success(salaryService.getAvgSalaryByLocation()));
    }

    @GetMapping("/analytics/by-yoe")
    public ResponseEntity<ApiResponse<List<com.salaryinsights.dto.response.YoeSalaryDTO>>> getByYoe() {
        return ResponseEntity.ok(ApiResponse.success(salaryService.getAvgSalaryByYoe()));
    }

    @GetMapping("/stats/this-month")
    public ResponseEntity<ApiResponse<Long>> getSubmissionsThisMonth() {
        return ResponseEntity.ok(ApiResponse.success(salaryService.getSubmissionsThisMonth()));
    }

    @GetMapping("/analytics/by-company")
    public ResponseEntity<ApiResponse<List<SalaryAggregationDTO>>> getByCompany() {
        return ResponseEntity.ok(ApiResponse.success(salaryService.getAvgSalaryByCompany()));
    }

    /**
     * GET /public/salaries/analytics/by-company-level
     * Optional ?locations=Bengaluru&locations=Pune — when provided, averages are
     * scoped to those locations only (used by DashboardPage location filter).
     * No param = nationwide averages (default, backwards compatible).
     */
    @GetMapping("/analytics/by-company-level")
    public ResponseEntity<ApiResponse<List<com.salaryinsights.dto.response.CompanyLevelSalaryDTO>>> getByCompanyAndLevel(
            @RequestParam(required = false) List<String> locations) {
        List<com.salaryinsights.dto.response.CompanyLevelSalaryDTO> data =
            (locations != null && !locations.isEmpty())
                ? salaryService.getAvgSalaryByCompanyAndLevelFiltered(locations)
                : salaryService.getAvgSalaryByCompanyAndLevel();
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/analytics/by-location-level")
    public ResponseEntity<ApiResponse<List<com.salaryinsights.dto.response.LocationLevelSalaryDTO>>> getByLocationAndLevel() {
        return ResponseEntity.ok(ApiResponse.success(salaryService.getAvgSalaryByLocationAndLevel()));
    }

    @GetMapping("/analytics/by-internal-level")
    public ResponseEntity<ApiResponse<List<SalaryAggregationDTO>>> getByInternalLevel(
            @RequestParam(required = false) List<String> locations) {
        return ResponseEntity.ok(ApiResponse.success(salaryService.getAvgSalaryByInternalLevel(locations)));
    }
}
