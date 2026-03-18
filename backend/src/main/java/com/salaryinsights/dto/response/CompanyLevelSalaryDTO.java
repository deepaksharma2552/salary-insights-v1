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
    private String internalLevel;   // display name e.g. "SDE 1"
    private Double avgBaseSalary;
    private Double avgBonus;
    private Double avgEquity;
    private Long count;
}
