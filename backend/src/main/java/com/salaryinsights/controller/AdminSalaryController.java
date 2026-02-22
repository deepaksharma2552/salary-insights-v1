package com.salaryinsights.controller;

import com.salaryinsights.dto.response.*;
import com.salaryinsights.enums.ReviewStatus;
import com.salaryinsights.service.impl.SalaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/admin/salaries")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminSalaryController {

    private final SalaryService salaryService;

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<PagedResponse<SalaryResponse>>> getPending(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.success(salaryService.getPendingSalaries(pageable)));
    }

    @PatchMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<SalaryResponse>> approve(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success("Approved",
                salaryService.reviewSalary(id, ReviewStatus.APPROVED, null)));
    }

    @PatchMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<SalaryResponse>> reject(
            @PathVariable UUID id, @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(ApiResponse.success("Rejected",
                salaryService.reviewSalary(id, ReviewStatus.REJECTED, reason)));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<AdminDashboardResponse>> getDashboard() {
        return ResponseEntity.ok(ApiResponse.success(salaryService.getAdminDashboard()));
    }
}
