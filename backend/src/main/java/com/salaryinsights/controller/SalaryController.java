package com.salaryinsights.controller;

import com.salaryinsights.dto.request.SalaryRequest;
import com.salaryinsights.dto.response.ApiResponse;
import com.salaryinsights.dto.response.SalaryResponse;
import com.salaryinsights.service.impl.SalaryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/salaries")
@RequiredArgsConstructor
public class SalaryController {

    private final SalaryService salaryService;

    @PostMapping("/submit")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<SalaryResponse>> submitSalary(@Valid @RequestBody SalaryRequest request) {
        SalaryResponse response = salaryService.submitSalary(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Salary submitted for review", response));
    }
}
