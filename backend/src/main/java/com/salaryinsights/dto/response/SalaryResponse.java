package com.salaryinsights.dto.response;

import com.salaryinsights.enums.EmploymentType;
import com.salaryinsights.enums.ExperienceLevel;
import com.salaryinsights.enums.ReviewStatus;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class SalaryResponse {
    private UUID id;
    private UUID companyId;
    private String companyName;
    private String jobTitle;
    private String department;
    private ExperienceLevel experienceLevel;
    private com.salaryinsights.enums.InternalLevel companyInternalLevel;
    private String standardizedLevelName;
    private com.salaryinsights.enums.Location location;
    private Integer yearsOfExperience;
    private BigDecimal baseSalary;
    private BigDecimal bonus;
    private BigDecimal equity;
    private BigDecimal totalCompensation;
    private EmploymentType employmentType;
    private ReviewStatus reviewStatus;
    private String rejectionReason;
    // Job function fields
    private UUID   jobFunctionId;
    private String jobFunctionName;
    private UUID   functionLevelId;
    private String functionLevelName;
    private String submittedByEmail;
    private LocalDateTime createdAt;
    private String logoUrl;
    private String website;
}
