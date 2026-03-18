package com.salaryinsights.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class LocationLevelSalaryDTO {
    private String location;
    private String internalLevel;
    private Double avgBaseSalary;
    private Double avgBonus;
    private Double avgEquity;
    private Double avgTotalCompensation;
    private Long count;
}
