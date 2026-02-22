package com.salaryinsights.controller;

import com.salaryinsights.dto.response.ApiResponse;
import com.salaryinsights.dto.response.CompanyResponse;
import com.salaryinsights.dto.response.PagedResponse;
import com.salaryinsights.service.impl.CompanyService;
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

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<CompanyResponse>>> getCompanies(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String industry,
            @RequestParam(required = false) String location,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        PageRequest pageable = PageRequest.of(page, size, Sort.by("name").ascending());
        return ResponseEntity.ok(ApiResponse.success(
                companyService.getAllCompanies(name, industry, location, pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CompanyResponse>> getCompany(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(companyService.getCompanyById(id)));
    }

    @GetMapping("/industries")
    public ResponseEntity<ApiResponse<List<String>>> getIndustries() {
        return ResponseEntity.ok(ApiResponse.success(companyService.getIndustries()));
    }
}
