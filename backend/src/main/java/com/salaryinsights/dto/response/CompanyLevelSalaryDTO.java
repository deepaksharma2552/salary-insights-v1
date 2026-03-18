package com.salaryinsights.dto.response;

import com.salaryinsights.enums.InternalLevel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CompanyLevelSalaryDTO {
    private String companyName;
    private String internalLevel;
    private Double avgBaseSalary;
    private Double avgBonus;
    private Double avgEquity;
    private Double avgTotalCompensation;
    private Long count;
    private Long companyTotalEntries;  // total approved entries across all levels — used for confidence
    // Company logo fields
    private String companyId;
    private String logoUrl;
    private String website;
    // Confidence fields (company-level, same for all levels of a company)
    private LocalDateTime mostRecentEntry;
    private String confidenceTier;
    private String confidenceLabel;
}
