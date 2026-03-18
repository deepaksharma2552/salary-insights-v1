package com.salaryinsights.dto.response;

import com.salaryinsights.enums.InternalLevel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CompanyLevelSalaryDTO {
    private String companyName;
    private String internalLevel;
    private Double avgBaseSalary;
    private Double avgBonus;
    private Double avgEquity;
    private Long count;
    private Long companyTotalEntries;  // total approved entries across all levels — used for confidence
    // Company logo fields
    private String companyId;
    private String logoUrl;
    private String website;
}
