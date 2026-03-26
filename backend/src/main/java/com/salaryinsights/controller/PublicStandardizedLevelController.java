package com.salaryinsights.controller;

import com.salaryinsights.dto.response.ApiResponse;
import com.salaryinsights.dto.response.StandardizedLevelResponse;
import com.salaryinsights.service.impl.LevelMappingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Public endpoint for standardized levels.
 * Used by the frontend to populate the "Maps to Standardized Level" dropdown
 * in the Job Functions admin page — and anywhere else a level picker is needed.
 * Sorted by hierarchy_rank ascending (most junior first).
 * No auth required — this is reference data, same as job functions.
 */
@RestController
@RequestMapping("/public/standardized-levels")
@RequiredArgsConstructor
public class PublicStandardizedLevelController {

    private final LevelMappingService levelMappingService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<StandardizedLevelResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(levelMappingService.getAllStandardizedLevels()));
    }
}
