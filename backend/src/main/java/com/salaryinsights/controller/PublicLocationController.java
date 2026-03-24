package com.salaryinsights.controller;

import com.salaryinsights.dto.response.ApiResponse;
import com.salaryinsights.dto.response.LocationOptionDTO;
import com.salaryinsights.enums.Location;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/public/locations")
public class PublicLocationController {

    /**
     * GET /public/locations
     * Returns all supported Location enum values as { value, label } pairs.
     *
     * Cached under the existing "referenceData" Caffeine cache (24h TTL).
     * No DB query — the enum is the source of truth, so this is pure in-memory
     * after the first call. Frontend holds the result for the session, so
     * navigation never triggers a re-fetch.
     *
     * Used by the useLocations() hook to populate every location dropdown
     * and filter across the app (DashboardPage, SalariesPage, SubmitSalaryPage,
     * PostOpportunityPage).
     */
    @GetMapping
    @Cacheable(value = "referenceData", key = "'allLocations'")
    public ResponseEntity<ApiResponse<List<LocationOptionDTO>>> getAll() {
        List<LocationOptionDTO> locations = Arrays.stream(Location.values())
            .map(loc -> new LocationOptionDTO(loc.name(), loc.getDisplayName()))
            .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(locations));
    }
}
