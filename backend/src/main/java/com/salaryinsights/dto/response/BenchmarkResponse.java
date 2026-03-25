package com.salaryinsights.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Returned by GET /public/salaries/benchmark
 * Contains percentile stats for a given role + level + location combination
 * so the frontend can show "your offer vs. the market".
 */
@Data
@Builder
public class BenchmarkResponse {

    // Input echo — so the client knows what was matched
    private String  role;
    private String  jobFunction;         // display name of the matched function
    private String  level;               // display name of the matched level
    private String  location;
    private long    sampleSize;          // Number of approved entries matched

    // Total Compensation percentiles (in rupees)
    private BigDecimal p25Tc;
    private BigDecimal p50Tc;            // median
    private BigDecimal p75Tc;
    private BigDecimal avgTc;

    // Base salary percentiles
    private BigDecimal p25Base;
    private BigDecimal p50Base;
    private BigDecimal p75Base;
    private BigDecimal avgBase;

    // Convenience fields for the "you vs market" calculation
    private BigDecimal avgBonus;
    private BigDecimal avgEquity;

    // Whether results are exact-match or broadened (e.g. location dropped)
    private boolean broadened;
    private String  broadeningReason;
}
