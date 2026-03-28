package com.salaryinsights.controller;

import com.salaryinsights.dto.request.AdminSalaryUpdateRequest;
import com.salaryinsights.dto.response.*;
import com.salaryinsights.entity.AuditLog;
import com.salaryinsights.enums.ReviewStatus;
import com.salaryinsights.repository.AuditLogRepository;
import com.salaryinsights.repository.CompanyRepository;
import com.salaryinsights.repository.SalaryEntryRepository;
import com.salaryinsights.service.ai.AiSalaryEnrichmentService;
import com.salaryinsights.service.ai.AiSalaryEnrichmentService.EnrichJob;
import com.salaryinsights.service.impl.SalaryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
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

    private final SalaryService             salaryService;
    private final AiSalaryEnrichmentService aiSalaryEnrichmentService;
    private final SalaryEntryRepository     salaryEntryRepository;
    private final AuditLogRepository        auditLogRepository;
    private final CompanyRepository         companyRepository;

    // ── Enrichment info ────────────────────────────────────────────────────────

    /**
     * GET /admin/salaries/enrich/info?companyName=Google
     *
     * Returns pre-flight context for the enrichment panel:
     *   - lastEnrichedAt  — ISO timestamp of the last ENRICH_COMPLETED audit log for this company (null if never)
     *   - pendingCount    — number of PENDING salary entries currently queued for this company
     *
     * Used by the frontend to show "Last enriched 2 days ago · 4 pending review" before the admin triggers a new run.
     * Lightweight — two fast indexed queries, no Claude call.
     */
    @GetMapping("/enrich/info")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getEnrichInfo(
            @RequestParam String companyName) {

        if (companyName == null || companyName.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("companyName is required"));
        }

        String name = companyName.trim();

        // Last enrichment timestamp — find the most recent ENRICH_COMPLETED audit log for this company
        String lastEnrichedAt = null;
        try {
            Specification<AuditLog> spec = (root, q, cb) -> cb.and(
                cb.equal(root.get("entityType"), "AiEnrichment"),
                cb.equal(root.get("action"), "ENRICH_COMPLETED"),
                cb.like(cb.lower(root.get("entityId")), "%" + name.toLowerCase() + "%")
            );
            var logs = auditLogRepository.findAll(spec, PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "createdAt")));
            if (logs.hasContent()) {
                lastEnrichedAt = logs.getContent().get(0).getCreatedAt().toString();
            }
        } catch (Exception e) {
            // Non-fatal — frontend handles null gracefully
        }

        // Pending count — how many entries for this company are waiting for review
        long pendingCount = 0;
        try {
            var company = companyRepository.findByNameIgnoreCase(name);
            if (company.isPresent()) {
                Specification<com.salaryinsights.entity.SalaryEntry> entrySpec = (root, q, cb) -> cb.and(
                    cb.equal(root.get("company"), company.get()),
                    cb.equal(root.get("reviewStatus"), ReviewStatus.PENDING)
                );
                pendingCount = salaryEntryRepository.count(entrySpec);
            }
        } catch (Exception e) {
            // Non-fatal
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("companyName",    name);
        result.put("lastEnrichedAt", lastEnrichedAt);
        result.put("pendingCount",   pendingCount);

        return ResponseEntity.ok(ApiResponse.success("ok", result));
    }

    // ── Pending queue ──────────────────────────────────────────────────────────

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

    /**
     * POST /admin/salaries/bulk-approve
     *
     * Approves a list of salary entry IDs in one shot.
     * Body: { "ids": ["uuid1", "uuid2", ...] }
     * Returns: { "approved": N, "failed": M, "errors": [...] }
     *
     * Processes every ID independently — a single failure does not abort the rest.
     * Max 200 IDs per request to prevent runaway transactions.
     */
    @PostMapping("/bulk-approve")
    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkApprove(
            @RequestBody Map<String, List<String>> body) {

        List<String> rawIds = body != null ? body.get("ids") : null;
        if (rawIds == null || rawIds.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("ids list is required"));
        }
        if (rawIds.size() > 200) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Maximum 200 IDs per request"));
        }

        int approved = 0, failed = 0;
        List<String> errors = new java.util.ArrayList<>();

        for (String rawId : rawIds) {
            try {
                UUID id = UUID.fromString(rawId.trim());
                salaryService.reviewSalary(id, ReviewStatus.APPROVED, null);
                approved++;
            } catch (Exception e) {
                failed++;
                errors.add(rawId + ": " + e.getMessage());
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("approved", approved);
        result.put("failed",   failed);
        if (!errors.isEmpty()) result.put("errors", errors);

        return ResponseEntity.ok(ApiResponse.success(
                String.format("Bulk approve complete: %d approved, %d failed", approved, failed),
                result));
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

    // ── AI salary enrichment ───────────────────────────────────────────────────

    /**
     * POST /admin/salaries/enrich
     *
     * Kicks off an async enrichment job and returns a jobId immediately (< 50 ms).
     * The Claude + web_search work runs in the background on enrichExecutor.
     * Poll GET /admin/salaries/enrich/{jobId} every 2 s until status != RUNNING.
     *
     * Body:    { "companyName": "Google" }
     * Returns: { "jobId": "uuid", "companyName": "Google", "status": "RUNNING" }
     *
     * HTTP 400 — missing companyName
     * HTTP 429 — rate limited (1 enrichment per company per hour)
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
            EnrichJob job = aiSalaryEnrichmentService.submitEnrichJob(companyName.trim());
            return ResponseEntity.ok(ApiResponse.success("Enrichment job started", jobToMap(job)));

        } catch (IllegalStateException e) {
            return ResponseEntity.status(429).body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * GET /admin/salaries/enrich/{jobId}
     *
     * Poll this endpoint every 2 s after calling POST /enrich.
     * Returns the current job status.
     *
     * status = RUNNING → keep polling
     * status = DONE    → { inserted: N, companyName: "..." }
     * status = FAILED  → { error: "..." }
     *
     * HTTP 404 — jobId unknown or expired (jobs expire after 2 hours)
     */
    @GetMapping("/enrich/{jobId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getEnrichJob(
            @PathVariable String jobId) {

        EnrichJob job = aiSalaryEnrichmentService.getJob(jobId);
        if (job == null) {
            return ResponseEntity.status(404)
                .body(ApiResponse.error("Job not found or expired: " + jobId));
        }

        return ResponseEntity.ok(ApiResponse.success(job.getStatus().name(), jobToMap(job)));
    }

    // ── Approved salaries — browse, edit, delete ───────────────────────────────

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
        Sort.Direction dir = "ASC".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;
        String safeSort = switch (sort) {
            case "baseSalary", "totalCompensation", "yearsOfExperience",
                 "experienceLevel", "createdAt", "updatedAt" -> sort;
            default -> "createdAt";
        };

        PageRequest pageable = PageRequest.of(page, safeSize, Sort.by(dir, safeSort));
        return ResponseEntity.ok(ApiResponse.success(
                salaryService.getApprovedSalariesAdmin(
                        companyId, companyName, jobTitle,
                        location, experienceLevel, employmentType, pageable)));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<SalaryResponse>> updateApproved(
            @PathVariable UUID id,
            @Valid @RequestBody AdminSalaryUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Updated",
                salaryService.updateApprovedSalary(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteApproved(@PathVariable UUID id) {
        salaryService.deleteApprovedSalary(id);
        return ResponseEntity.ok(ApiResponse.success("Deleted", null));
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private Map<String, Object> jobToMap(EnrichJob job) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("jobId",       job.getJobId());
        m.put("companyName", job.getCompanyName());
        m.put("status",      job.getStatus().name());
        m.put("inserted",    job.getInserted());
        if (job.getError() != null) m.put("error", job.getError());
        return m;
    }
}
