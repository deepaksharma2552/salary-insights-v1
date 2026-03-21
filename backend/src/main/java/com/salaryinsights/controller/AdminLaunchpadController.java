package com.salaryinsights.controller;

import com.salaryinsights.dto.request.LaunchpadResourceRequest;
import com.salaryinsights.dto.response.*;
import com.salaryinsights.enums.LaunchpadStatus;
import com.salaryinsights.service.impl.LaunchpadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/admin/launchpad")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminLaunchpadController {

    private final LaunchpadService launchpadService;

    // ── Resources ─────────────────────────────────────────────────────────────

    @GetMapping("/resources")
    public ResponseEntity<ApiResponse<List<LaunchpadResourceResponse>>> getAllResources() {
        return ResponseEntity.ok(ApiResponse.success(launchpadService.getAllResourcesAdmin()));
    }

    @PostMapping("/resources")
    public ResponseEntity<ApiResponse<LaunchpadResourceResponse>> createResource(
            @Valid @RequestBody LaunchpadResourceRequest req) {
        return ResponseEntity.status(201)
                .body(ApiResponse.success("Created", launchpadService.createResource(req)));
    }

    @PutMapping("/resources/{id}")
    public ResponseEntity<ApiResponse<LaunchpadResourceResponse>> updateResource(
            @PathVariable UUID id, @Valid @RequestBody LaunchpadResourceRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Updated", launchpadService.updateResource(id, req)));
    }

    @PatchMapping("/resources/{id}/toggle-active")
    public ResponseEntity<ApiResponse<LaunchpadResourceResponse>> toggleResource(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success("Toggled", launchpadService.toggleResourceActive(id)));
    }

    @DeleteMapping("/resources/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteResource(@PathVariable UUID id) {
        launchpadService.deleteResource(id);
        return ResponseEntity.ok(ApiResponse.success("Deleted", null));
    }

    // ── Experiences ───────────────────────────────────────────────────────────

    @GetMapping("/experiences")
    public ResponseEntity<ApiResponse<CursorPage<LaunchpadExperienceResponse>>> getExperiences(
            @RequestParam(required = false) LaunchpadStatus status,
            @RequestParam(required = false) Boolean paused,
            @RequestParam(required = false) String cursor) {
        return ResponseEntity.ok(ApiResponse.success(
                launchpadService.getExperiencesAdmin(status, paused, cursor)));
    }

    @PatchMapping("/experiences/{id}/review")
    public ResponseEntity<ApiResponse<LaunchpadExperienceResponse>> review(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        LaunchpadStatus status = LaunchpadStatus.valueOf(body.get("status"));
        String note = body.get("adminNote");
        return ResponseEntity.ok(ApiResponse.success("Reviewed",
                launchpadService.reviewExperience(id, status, note)));
    }

    @PatchMapping("/experiences/{id}/toggle-active")
    public ResponseEntity<ApiResponse<LaunchpadExperienceResponse>> toggleExp(@PathVariable UUID id) {
        LaunchpadExperienceResponse r = launchpadService.toggleExperienceActive(id);
        return ResponseEntity.ok(ApiResponse.success(r.isActive() ? "Reactivated" : "Paused", r));
    }
}
