package com.salaryinsights.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

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
}
