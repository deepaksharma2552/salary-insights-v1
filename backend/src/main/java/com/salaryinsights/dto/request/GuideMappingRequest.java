package com.salaryinsights.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.UUID;

/**
 * Saves the complete overlap mapping for one company level.
 * Each entry pairs a standard level with an overlap percentage.
 * All percentages must sum to exactly 100.
 */
@Data
public class GuideMappingRequest {

    @NotNull(message = "Company level ID is required")
    private UUID guideCompanyLevelId;

    @NotNull(message = "At least one mapping entry is required")
    @Valid
    private List<MappingEntry> entries;

    @Data
    public static class MappingEntry {

        @NotNull(message = "Standard level ID is required")
        private UUID guideStandardLevelId;

        @NotNull(message = "Overlap percentage is required")
        @Min(value = 1,   message = "Overlap percentage must be at least 1")
        @Max(value = 100, message = "Overlap percentage cannot exceed 100")
        private Integer overlapPct;
    }
}
