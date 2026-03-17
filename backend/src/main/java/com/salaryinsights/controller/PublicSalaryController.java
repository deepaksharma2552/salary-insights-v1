package com.salaryinsights.controller;

import com.salaryinsights.dto.response.*;
import com.salaryinsights.enums.ExperienceLevel;
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

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<SalaryResponse>>> getSalaries(
            @RequestParam(required = false) UUID companyId,
            @RequestParam(required = false) String companyName,
            @RequestParam(required = false) String jobTitle,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) ExperienceLevel experienceLevel,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        PagedResponse<SalaryResponse> data = salaryService.getApprovedSalaries(
                companyId, companyName, jobTitle, location, experienceLevel, pageable);
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

    @GetMapping("/analytics/by-company")
    public ResponseEntity<ApiResponse<List<SalaryAggregationDTO>>> getByCompany() {
        return ResponseEntity.ok(ApiResponse.success(salaryService.getAvgSalaryByCompany()));
    }

    @GetMapping("/analytics/by-company-level")
    public ResponseEntity<ApiResponse<List<com.salaryinsights.dto.response.CompanyLevelSalaryDTO>>> getByCompanyAndLevel() {
        return ResponseEntity.ok(ApiResponse.success(salaryService.getAvgSalaryByCompanyAndLevel()));
    }
}
