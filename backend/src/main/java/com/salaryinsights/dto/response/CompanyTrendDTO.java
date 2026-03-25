package com.salaryinsights.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Returned by GET /public/salaries/trends
 * Contains 6-month vs prior-6-month avg TC per company so the frontend
 * can render ↑ ↓ → trend arrows on salary rows and company cards.
 *
 * Trend direction is computed client-side from recentAvgTc vs priorAvgTc
 * (keeps the DTO simple and lets the client choose threshold thresholds).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CompanyTrendDTO {
    private UUID       companyId;
    private String     companyName;

    /** Average TC for approved entries in the most recent 6 months. */
    private BigDecimal recentAvgTc;

    /** Average TC for approved entries in the prior 6-month window (6-12 months ago). */
    private BigDecimal priorAvgTc;

    /** Entry count used for the recent window — surface on the UI as confidence signal. */
    private long       recentCount;

    /** Entry count used for the prior window. */
    private long       priorCount;
}
