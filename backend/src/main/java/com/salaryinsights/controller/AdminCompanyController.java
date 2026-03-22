package com.salaryinsights.controller;

import com.salaryinsights.dto.request.CompanyRequest;
import com.salaryinsights.dto.response.*;
import com.salaryinsights.service.impl.CompanyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/admin/companies")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminCompanyController {

    private final CompanyService companyService;

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<CompanyResponse>>> getAllCompanies(
            @RequestParam(required = false) String name,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {

        PageRequest pageable = PageRequest.of(page, size, Sort.by("name").ascending());
        return ResponseEntity.ok(ApiResponse.success(companyService.getAllCompaniesAdmin(name, pageable)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CompanyResponse>> createCompany(@Valid @RequestBody CompanyRequest request) {
        CompanyResponse response = companyService.createCompany(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Company created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CompanyResponse>> updateCompany(
            @PathVariable UUID id, @Valid @RequestBody CompanyRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Company updated", companyService.updateCompany(id, request)));
    }

    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<ApiResponse<Void>> toggleStatus(@PathVariable UUID id) {
        companyService.toggleStatus(id);
        return ResponseEntity.ok(ApiResponse.success("Status toggled", null));
    }

    /**
     * PATCH /admin/companies/{id}/benefits
     * Admin updates the benefits list for a company.
     * Source: company's official benefits page.
     */
    @PatchMapping("/{id}/benefits")
    public ResponseEntity<ApiResponse<CompanyResponse>> updateBenefits(
            @PathVariable UUID id,
            @RequestBody java.util.List<String> benefits) {
        return ResponseEntity.ok(ApiResponse.success(
                "Benefits updated", companyService.updateBenefits(id, benefits)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCompany(@PathVariable UUID id) {
        companyService.deleteCompany(id);
        return ResponseEntity.ok(ApiResponse.success("Company deleted", null));
    }
}
