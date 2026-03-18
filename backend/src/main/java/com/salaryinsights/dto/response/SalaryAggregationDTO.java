package com.salaryinsights.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SalaryAggregationDTO {
    private String groupKey;
    private Double avgBaseSalary;
    private Double avgBonus;
    private Double avgEquity;
    private Double avgTotalCompensation;
    private Long count;
    // Company logo fields (populated for company-grouped queries)
    private String companyId;
    private String logoUrl;
    private String website;
    // Confidence fields
    private LocalDateTime mostRecentEntry;
    private String confidenceTier;  // HIGH / MEDIUM / LOW
    private String confidenceLabel; // e.g. "High · 14 entries · updated 2mo ago"
}
