package com.salaryinsights.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Returned by GET /public/companies/{id}/salary-summary
 * Used by the company card "Breakdown by level" lazy expand.
 * Cached 1 hour at the backend — safe to call per card click.
 */
@Data
@Builder
public class CompanySalarySummaryResponse {

    private String companyId;
    private String companyName;

    /** TC range — same as on the card, included here for convenience. */
    private Double tcMin;
    private Double tcMax;

    /** Salary breakdown by internal level, ordered lowest → highest TC. */
    private List<LevelRow> levels;

    @Data
    @Builder
    public static class LevelRow {
        private String functionName;
        private String internalLevel;
        private Double avgBase;
        private Double avgBonus;
        private Double avgEquity;
        private Double avgTC;
        private Long   count;
    }
}
