package com.salaryinsights.controller;

import com.salaryinsights.dto.response.ApiResponse;
import com.salaryinsights.dto.response.JobFunctionResponse;
import com.salaryinsights.service.impl.JobFunctionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/public/job-functions")
@RequiredArgsConstructor
public class PublicJobFunctionController {

    private final JobFunctionService service;

    /**
     * Returns all job functions with their levels.
     * Served from Caffeine cache ("referenceData") — single DB hit per 24h regardless of user volume.
     * Used by AppDataContext on app startup to populate dropdowns everywhere.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<JobFunctionResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(service.getAllFunctionsWithLevels()));
    }
}
