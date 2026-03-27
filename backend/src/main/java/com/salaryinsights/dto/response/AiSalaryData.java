package com.salaryinsights.dto.response;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Structured salary data returned by the AI / LLM for a given company.
 * The LLM is prompted to respond in this JSON shape.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiSalaryData {

    private String companyName;
    private String location;
    private String dataSource;   // e.g. "levels.fyi", "glassdoor", "linkedin", "ai_inference"
    private List<AiSalaryEntry> entries;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiSalaryEntry {
        private String jobTitle;
        private String department;
        private String internalLevel;       // e.g. "L4", "SDE-II", "Senior"
        private String experienceLevel;     // maps to ExperienceLevel enum
        private Integer yearsOfExperience;  // typical YOE for this role/level
        private String employmentType;      // maps to EmploymentType enum
        private BigDecimal baseSalary;
        private BigDecimal bonus;
        private BigDecimal equity;
        private String currency;            // default USD
        private String notes;
    }
}
