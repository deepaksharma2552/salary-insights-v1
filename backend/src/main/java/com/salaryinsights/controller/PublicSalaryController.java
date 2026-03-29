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
            @RequestParam(required = false) UUID jobFunctionId,
            @RequestParam(required = false) UUID functionLevelId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        PagedResponse<SalaryResponse> data = salaryService.getApprovedSalaries(
                companyId, companyName, jobTitle, location, experienceLevel, employmentType, jobFunctionId, functionLevelId, pageable);
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

    @GetMapping("/stats/last-month")
    public ResponseEntity<ApiResponse<Long>> getSubmissionsLastMonth() {
        return ResponseEntity.ok(ApiResponse.success(salaryService.getSubmissionsLastMonth()));
    }

    @GetMapping("/analytics/by-company")
    public ResponseEntity<ApiResponse<List<SalaryAggregationDTO>>> getByCompany() {
        return ResponseEntity.ok(ApiResponse.success(salaryService.getAvgSalaryByCompany()));
    }

    /**
    /**
     * GET /public/salaries/analytics/by-company-level
     * Optional ?locations=Bengaluru&locations=Pune — when provided, averages are
     * scoped to those locations only (used by DashboardPage location filter).
     * Optional ?jobFunctionId=<uuid> — when provided, levels are scoped to that
     * job function's function_levels (not the global standardized_levels taxonomy).
     * No params = nationwide averages across all functions (backwards compatible).
     */
    @GetMapping("/analytics/by-company-level")
    public ResponseEntity<ApiResponse<List<com.salaryinsights.dto.response.CompanyLevelSalaryDTO>>> getByCompanyAndLevel(
            @RequestParam(required = false) List<String> locations,
            @RequestParam(required = false) String jobFunctionId) {
        List<com.salaryinsights.dto.response.CompanyLevelSalaryDTO> data;
        boolean hasLocations = locations != null && !locations.isEmpty();
        boolean hasFn        = jobFunctionId != null && !jobFunctionId.isBlank();
        if (hasFn && hasLocations) {
            data = salaryService.getAvgSalaryByCompanyAndLevelByFunctionFiltered(jobFunctionId, locations);
        } else if (hasFn) {
            data = salaryService.getAvgSalaryByCompanyAndLevelByFunction(jobFunctionId);
        } else if (hasLocations) {
            data = salaryService.getAvgSalaryByCompanyAndLevelFiltered(locations);
        } else {
            data = salaryService.getAvgSalaryByCompanyAndLevel();
        }
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

    /**
     * GET /public/salaries/benchmark
     * Returns p25/p50/p75 + avg for TC and base salary for a given role/level/location.
     * Automatically broadens the search if sample size < 5.
     * Not cached — parameterised per user input; query is fast via partial index.
     */
    @GetMapping("/benchmark")
    public ResponseEntity<ApiResponse<com.salaryinsights.dto.response.BenchmarkResponse>> benchmark(
            @RequestParam(required = false) String jobTitle,
            @RequestParam(required = false) String jobFunctionId,
            @RequestParam(required = false) String functionLevelId,
            @RequestParam(required = false) String location) {
        return ResponseEntity.ok(ApiResponse.success(
                salaryService.getBenchmark(jobTitle, jobFunctionId, functionLevelId, location)));
    }

    /**
     * GET /public/salaries/trends
     * Returns recent (0-6 months) vs prior (6-12 months) avg TC per company.
     * Cached 1h. Used to render trend arrows on the salary table.
     */
    @GetMapping("/trends")
    public ResponseEntity<ApiResponse<List<com.salaryinsights.dto.response.CompanyTrendDTO>>> trends() {
        return ResponseEntity.ok(ApiResponse.success(salaryService.getSalaryTrends()));
    }
}
