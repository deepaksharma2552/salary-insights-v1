package com.salaryinsights.controller;

import com.salaryinsights.dto.request.AdminSalaryUpdateRequest;
import com.salaryinsights.dto.response.*;
import com.salaryinsights.enums.ReviewStatus;
import com.salaryinsights.service.ai.AiSalaryEnrichmentService;
import com.salaryinsights.service.impl.SalaryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/admin/salaries")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminSalaryController {

    private final SalaryService              salaryService;
    private final AiSalaryEnrichmentService  aiSalaryEnrichmentService;

    // ──────────────────────────────────────────
    // Pending queue
    // ──────────────────────────────────────────

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<PagedResponse<SalaryResponse>>> getPending(
            @RequestParam(defaultValue = "0")  int page,
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
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(ApiResponse.success("Rejected",
                salaryService.reviewSalary(id, ReviewStatus.REJECTED, reason)));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<AdminDashboardResponse>> getDashboard(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        return ResponseEntity.ok(ApiResponse.success(salaryService.getAdminDashboard(year, month)));
    }

    // ──────────────────────────────────────────
    // AI salary enrichment
    // ──────────────────────────────────────────

    /**
     * POST /admin/salaries/enrich
     *
     * Triggers AI-powered salary enrichment for a given company.
     * Claude (claude-sonnet-4-20250514) searches the web for real salary data,
     * structures the results, and inserts them as PENDING for admin review.
     * Nothing bypasses the review queue.
     *
     * Body:    { "companyName": "Google" }
     * Returns: { "inserted": 12, "companyName": "Google" }
     *
     * HTTP 429 — rate limited (1 enrichment per company per hour)
     * HTTP 400 — missing companyName
     *
     * This call typically takes 5–15 seconds due to web search + LLM inference.
     */
    @PostMapping("/enrich")
    public ResponseEntity<ApiResponse<Map<String, Object>>> enrich(
            @RequestBody Map<String, String> body) {

        String companyName = body != null ? body.get("companyName") : null;
        if (companyName == null || companyName.isBlank()) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("companyName is required"));
        }

        try {
            int inserted = aiSalaryEnrichmentService.enrich(companyName.trim());

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("inserted", inserted);
            result.put("companyName", companyName.trim());

            return ResponseEntity.ok(ApiResponse.success(
                inserted + " salary entr" + (inserted == 1 ? "y" : "ies") + " queued for review",
                result));

        } catch (IllegalStateException e) {
            // Rate-limit hit — surface as 429
            return ResponseEntity.status(429)
                .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body(ApiResponse.error("Enrichment failed: " + e.getMessage()));
        }
    }

    // ──────────────────────────────────────────
    // Approved salaries — browse, edit, delete
    // ──────────────────────────────────────────

    /**
     * GET /admin/salaries/approved
     *
     * Returns paginated APPROVED entries with optional filters.
     * Page size is capped at 100 to protect DB at 200k–500k scale.
     *
     * Query params:
     *   page            int          (default 0)
     *   size            int          (default 50, max 100)
     *   companyId       UUID         filter by exact company
     *   companyName     String       partial, case-insensitive
     *   jobTitle        String       partial, case-insensitive
     *   location        String[]     repeating param (display name or enum name)
     *   experienceLevel String[]     repeating param (enum name e.g. MID, SENIOR)
     *   employmentType  String       enum name e.g. FULL_TIME
     *   sort            String       field name (default createdAt)
     *   direction       String       ASC | DESC (default DESC)
     */
    @GetMapping("/approved")
    public ResponseEntity<ApiResponse<PagedResponse<SalaryResponse>>> getApproved(
            @RequestParam(defaultValue = "0")          int page,
            @RequestParam(defaultValue = "50")         int size,
            @RequestParam(required = false)            UUID   companyId,
            @RequestParam(required = false)            String companyName,
            @RequestParam(required = false)            String jobTitle,
            @RequestParam(required = false)            List<String> location,
            @RequestParam(required = false)            List<String> experienceLevel,
            @RequestParam(required = false)            String employmentType,
            @RequestParam(defaultValue = "createdAt")  String sort,
            @RequestParam(defaultValue = "DESC")       String direction) {

        int safeSize = Math.min(size, 100);

        Sort.Direction dir = "ASC".equalsIgnoreCase(direction)
                ? Sort.Direction.ASC : Sort.Direction.DESC;

        String safeSort = switch (sort) {
            case "baseSalary", "totalCompensation", "yearsOfExperience",
                 "experienceLevel", "createdAt", "updatedAt" -> sort;
            default -> "createdAt";
        };

        PageRequest pageable = PageRequest.of(page, safeSize, Sort.by(dir, safeSort));

        return ResponseEntity.ok(ApiResponse.success(
                salaryService.getApprovedSalariesAdmin(
                        companyId, companyName, jobTitle,
                        location, experienceLevel, employmentType,
                        pageable)));
    }

    /**
     * PATCH /admin/salaries/{id}
     *
     * Partial update of an approved salary entry.
     * Only non-null fields in the request body are applied.
     */
    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<SalaryResponse>> updateApproved(
            @PathVariable UUID id,
            @Valid @RequestBody AdminSalaryUpdateRequest request) {

        return ResponseEntity.ok(ApiResponse.success("Updated",
                salaryService.updateApprovedSalary(id, request)));
    }

    /**
     * DELETE /admin/salaries/{id}
     *
     * Hard-deletes an approved salary entry.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteApproved(@PathVariable UUID id) {
        salaryService.deleteApprovedSalary(id);
        return ResponseEntity.ok(ApiResponse.success("Deleted", null));
    }
}
