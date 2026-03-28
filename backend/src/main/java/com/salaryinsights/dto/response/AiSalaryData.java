package com.salaryinsights.dto.response;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Structured salary data returned by the AI / LLM for a given company.
 * The LLM is prompted to respond in this JSON shape.
 *
 * Note: both location and dataSource are now per-entry fields on AiSalaryEntry
 * so that entries covering multiple cities and sourced from multiple sites are
 * attributed correctly. The top-level fields are kept for backwards compatibility
 * only and are no longer used by the enrichment service.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiSalaryData {

    private String companyName;

    /** @deprecated Per-entry location is now on AiSalaryEntry.location. Kept for backwards compatibility. */
    @Deprecated
    private String location;

    /**
     * @deprecated Per-entry dataSource is now on AiSalaryEntry.dataSource.
     * Kept for backwards compatibility with any old responses that omit the per-entry field.
     * The enrichment service falls back to this value if AiSalaryEntry.dataSource is blank.
     */
    @Deprecated
    private String dataSource;

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
        private String currency;            // always INR
        private String location;            // per-entry city, e.g. "Bengaluru", "Hyderabad", "Delhi NCR"
        private String dataSource;          // per-entry source, e.g. "levels.fyi", "glassdoor", "ambitionbox"
        private String notes;
    }
}
