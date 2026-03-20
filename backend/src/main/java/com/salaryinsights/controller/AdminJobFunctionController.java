package com.salaryinsights.controller;

import com.salaryinsights.dto.request.FunctionLevelRequest;
import com.salaryinsights.dto.request.JobFunctionRequest;
import com.salaryinsights.dto.response.ApiResponse;
import com.salaryinsights.dto.response.FunctionLevelResponse;
import com.salaryinsights.dto.response.JobFunctionResponse;
import com.salaryinsights.service.impl.JobFunctionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/admin/job-functions")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminJobFunctionController {

    private final JobFunctionService service;

    @GetMapping
    public ResponseEntity<ApiResponse<List<JobFunctionResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(service.getAllFunctionsWithLevels()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<JobFunctionResponse>> create(
            @Valid @RequestBody JobFunctionRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Created", service.createFunction(req)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<JobFunctionResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody JobFunctionRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Updated", service.updateFunction(id, req)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        service.deleteFunction(id);
        return ResponseEntity.ok(ApiResponse.success("Deleted", null));
    }

    // ── Levels ────────────────────────────────────────────────────────────────

    @PostMapping("/levels")
    public ResponseEntity<ApiResponse<FunctionLevelResponse>> addLevel(
            @Valid @RequestBody FunctionLevelRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Created", service.addLevel(req)));
    }

    @PutMapping("/levels/{id}")
    public ResponseEntity<ApiResponse<FunctionLevelResponse>> updateLevel(
            @PathVariable UUID id, @Valid @RequestBody FunctionLevelRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Updated", service.updateLevel(id, req)));
    }

    @DeleteMapping("/levels/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteLevel(@PathVariable UUID id) {
        service.deleteLevel(id);
        return ResponseEntity.ok(ApiResponse.success("Deleted", null));
    }
}
