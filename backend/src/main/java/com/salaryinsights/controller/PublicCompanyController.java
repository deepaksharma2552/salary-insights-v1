package com.salaryinsights.controller;

import com.salaryinsights.dto.response.ApiResponse;
import com.salaryinsights.dto.response.CompanyResponse;
import com.salaryinsights.dto.response.CompanySalarySummaryResponse;
import com.salaryinsights.dto.response.PagedResponse;
import com.salaryinsights.dto.response.SalaryResponse;
import com.salaryinsights.service.impl.CompanyService;
import com.salaryinsights.service.impl.SalaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/public/companies")
@RequiredArgsConstructor
public class PublicCompanyController {

    private final CompanyService companyService;
    private final SalaryService salaryService;

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<CompanyResponse>>> getCompanies(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String industry,
            @RequestParam(required = false) String location,
            @RequestParam(defaultValue = "entries") String sortBy,
            @RequestParam(defaultValue = "false") boolean showAll,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        PageRequest pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(ApiResponse.success(
                companyService.getAllCompanies(name, industry, location, sortBy, showAll, pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CompanyResponse>> getCompany(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(companyService.getCompanyById(id)));
    }

    @GetMapping("/industries")
    public ResponseEntity<ApiResponse<List<String>>> getIndustries() {
        return ResponseEntity.ok(ApiResponse.success(companyService.getIndustries()));
    }

    @GetMapping("/{id}/salaries")
    public ResponseEntity<ApiResponse<PagedResponse<SalaryResponse>>> getCompanySalaries(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) List<String> level,
            @RequestParam(required = false) List<String> location,
            @RequestParam(required = false) UUID jobFunctionId,
            @RequestParam(required = false) UUID functionLevelId,
            @RequestParam(defaultValue = "totalCompensation") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        Sort.Direction direction = sortDir.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC;
        String sortField = switch (sortBy) {
            case "baseSalary"  -> "baseSalary";
            case "createdAt"   -> "createdAt";
            default            -> "totalCompensation";
        };
        org.springframework.data.domain.PageRequest pageable =
            org.springframework.data.domain.PageRequest.of(page, size, Sort.by(direction, sortField));

        return ResponseEntity.ok(ApiResponse.success(
                salaryService.getApprovedSalaries(id, null, null, location, null, level, null, jobFunctionId, functionLevelId, pageable)));
    }

    /**
     * GET /public/companies/{id}/salary-summary
     * Lazy salary breakdown by internal level — called on card expand.
     * Cached 1 hour at backend. No auth required.
     */
    @GetMapping("/{id}/salary-summary")
    public ResponseEntity<ApiResponse<CompanySalarySummaryResponse>> getSalarySummary(
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(companyService.getSalarySummary(id)));
    }

    /**
     * GET /public/companies/hiring-now
     * Returns companyId → open role count for companies with ≥1 LIVE opportunity.
     * Cached 5 min. Used to render "X open roles" badges on salary rows.
     */
    @GetMapping("/hiring-now")
    public ResponseEntity<ApiResponse<List<com.salaryinsights.dto.response.CompanyHiringDTO>>> getHiringNow() {
        return ResponseEntity.ok(ApiResponse.success(salaryService.getHiringNow()));
    }
}
