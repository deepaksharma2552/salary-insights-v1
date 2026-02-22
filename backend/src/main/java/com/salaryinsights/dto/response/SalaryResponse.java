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
    private String companyInternalLevel;
    private String standardizedLevelName;
    private String location;
    private BigDecimal baseSalary;
    private BigDecimal bonus;
    private BigDecimal equity;
    private BigDecimal totalCompensation;
    private EmploymentType employmentType;
    private ReviewStatus reviewStatus;
    private String rejectionReason;
    private String submittedByEmail;
    private LocalDateTime createdAt;
}
