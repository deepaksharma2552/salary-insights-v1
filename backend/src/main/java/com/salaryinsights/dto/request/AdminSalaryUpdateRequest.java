package com.salaryinsights.dto.request;

import com.salaryinsights.enums.EmploymentType;
import com.salaryinsights.enums.ExperienceLevel;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Payload for PATCH /admin/salaries/{id}
 * All fields are optional — only non-null values are applied (partial update).
 */
@Data
public class AdminSalaryUpdateRequest {

    /** Reassign to a different company (must exist). */
    private UUID companyId;

    @Size(max = 200)
    private String jobTitle;

    @Size(max = 100)
    private String department;

    private ExperienceLevel experienceLevel;

    /**
     * Reassign the standardized level (replaces old companyInternalLevel enum field).
     * Pass the UUID of the desired standardized_levels row, or null to leave unchanged.
     */
    private UUID standardizedLevelId;

    /** Reassign job function (e.g. Engineering → Program). */
    private UUID jobFunctionId;

    /** Reassign function-specific level within the job function. */
    private UUID functionLevelId;

    private com.salaryinsights.enums.Location location;

    @Min(0) @Max(60)
    private Integer yearsOfExperience;

    @DecimalMin("0.0")
    private BigDecimal baseSalary;

    @DecimalMin("0.0")
    private BigDecimal bonus;

    @DecimalMin("0.0")
    private BigDecimal equity;

    private EmploymentType employmentType;
}
