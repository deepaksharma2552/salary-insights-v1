package com.salaryinsights.dto.request;

import com.salaryinsights.enums.ExperienceLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class StandardizedLevelRequest {
    @NotBlank
    private String name;

    @NotNull
    private Integer hierarchyRank;

    /** Optional description of scope / responsibilities. */
    private String description;

    /**
     * Explicit experience tier — replaces the old deriveFromRank() ladder.
     * Should be set for all new levels; null is tolerated for legacy backfill.
     */
    private ExperienceLevel experienceLevel;
}
