package com.salaryinsights.dto.response;

import lombok.Data;
import java.util.List;
import java.util.Map;

/**
 * Public Level Guide comparison grid response.
 *
 * standardLevels — ordered benchmark levels (rows)
 * companies      — selected companies (columns)
 * grid           — standardLevelId → companyId → list of GridCell
 *                  A list because a company level can partially overlap a row
 *                  (e.g. 60% at Senior AND 40% at this row)
 */
@Data
public class GuideLevelGridResponse {

    private List<StandardLevelRow>              standardLevels;
    private List<CompanyCol>                    companies;
    private Map<String, Map<String, List<GridCell>>> grid;

    @Data
    public static class StandardLevelRow {
        private String id;
        private String name;
        private int    rank;
        private String description;
    }

    @Data
    public static class CompanyCol {
        private String id;
        private String name;
        private String logoUrl;
        private String website;
    }

    /**
     * One entry per company level that touches this standard level row.
     * overlapPct shows how much of that company level lives here.
     * 100 = exact match. <100 = spans multiple rows.
     */
    @Data
    public static class GridCell {
        private String  title;
        private String  functionCategory;
        private Integer overlapPct;
    }
}
