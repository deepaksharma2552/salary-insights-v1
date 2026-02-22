package com.salaryinsights.dto.request;

import com.salaryinsights.enums.EmploymentType;
import com.salaryinsights.enums.ExperienceLevel;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class SalaryRequest {

    @NotNull
    private UUID companyId;

    @NotBlank @Size(max = 200)
    private String jobTitle;

    @Size(max = 100)
    private String department;

    @NotNull
    private ExperienceLevel experienceLevel;

    @Size(max = 100)
    private String companyInternalLevel;

    @Size(max = 200)
    private String location;

    @NotNull @DecimalMin("0.0")
    private BigDecimal baseSalary;

    @DecimalMin("0.0")
    private BigDecimal bonus;

    @DecimalMin("0.0")
    private BigDecimal equity;

    @NotNull
    private EmploymentType employmentType;
}
