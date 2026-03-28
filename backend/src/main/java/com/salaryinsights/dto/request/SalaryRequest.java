package com.salaryinsights.dto.request;

import com.salaryinsights.enums.EmploymentType;
import com.salaryinsights.enums.ExperienceLevel;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;


@Data
public class SalaryRequest {

    // Either companyId (existing) or companyName (auto-create) must be provided
    private UUID companyId;

    @Size(max = 255)
    private String companyName;

    @NotBlank @Size(max = 200)
    private String jobTitle;

    @Size(max = 100)
    private String department;

    private ExperienceLevel experienceLevel;   // optional — auto-derived from YOE or internalLevel if not sent

    private com.salaryinsights.enums.Location location;

    @Min(0) @Max(60)
    private Integer yearsOfExperience;

    @NotNull @DecimalMin("0.0")
    private BigDecimal baseSalary;

    @DecimalMin("0.0")
    private BigDecimal bonus;

    @DecimalMin("0.0")
    private BigDecimal equity;

    /** Raw total RSU grant before vesting normalisation — set by AI enrichment only */
    private BigDecimal equityTotalGrant;

    /** Data source: "levels.fyi", "glassdoor", "reddit", "User", "AI", etc. */
    @Size(max = 255)
    private String dataSource;

    /**
     * AI deduplication fingerprint — set internally by AiSalaryEnrichmentService.
     * Never sent by frontend clients; ignored for manual user submissions.
     */
    @Size(max = 64)
    private String aiFingerprint;

    // Job function + level (DB-driven, optional — existing entries have Engineering inferred)
    private UUID jobFunctionId;
    private UUID functionLevelId;

    /**
     * Standardized level override — set by AI enrichment via YOE-band mapping.
     * Takes precedence over the functionLevel → standardizedLevel propagation
     * so AI entries land in the correct SDE 1/2/3/Staff/Principal/Architect band.
     */
    private UUID standardizedLevelId;

    @NotNull
    private EmploymentType employmentType;
}
