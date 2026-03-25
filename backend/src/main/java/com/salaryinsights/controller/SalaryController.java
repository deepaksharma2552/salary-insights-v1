package com.salaryinsights.controller;

import com.salaryinsights.dto.request.SalaryRequest;
import com.salaryinsights.dto.response.ApiResponse;
import com.salaryinsights.dto.response.PagedResponse;
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

    /**
     * GET /salaries/my-submissions
     * Returns the authenticated user's own salary submissions (all statuses),
     * ordered by most recent first. Used by the "My Submissions" dashboard page.
     */
    @GetMapping("/my-submissions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PagedResponse<SalaryResponse>>> getMySubmissions(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        org.springframework.data.domain.PageRequest pageable =
            org.springframework.data.domain.PageRequest.of(page, size);
        return ResponseEntity.ok(ApiResponse.success(salaryService.getMySubmissions(pageable)));
    }
}
