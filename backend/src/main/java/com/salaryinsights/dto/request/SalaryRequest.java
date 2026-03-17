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

    @NotNull
    private ExperienceLevel experienceLevel;

    private com.salaryinsights.enums.InternalLevel companyInternalLevel;

    @Size(max = 200)
    private String location;

    @Min(0) @Max(60)
    private Integer yearsOfExperience;

    @NotNull @DecimalMin("0.0")
    private BigDecimal baseSalary;

    @DecimalMin("0.0")
    private BigDecimal bonus;

    @DecimalMin("0.0")
    private BigDecimal equity;

    @NotNull
    private EmploymentType employmentType;
}
