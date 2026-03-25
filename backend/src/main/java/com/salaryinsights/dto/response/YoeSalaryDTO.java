package com.salaryinsights.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * One data point for the YOE vs salary scatter/line chart.
 * Returned by GET /public/salaries/analytics/by-yoe.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class YoeSalaryDTO {
    private Integer yoe;
    private Double  avgBaseSalary;
    private Double  avgBonus;
    private Double  avgEquity;
    private Double  avgTotalCompensation;
    private Long    count;
}
