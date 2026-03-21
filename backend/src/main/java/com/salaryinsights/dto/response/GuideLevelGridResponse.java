package com.salaryinsights.dto.response;

import lombok.Data;
import java.util.List;
import java.util.Map;

/**
 * Response for the public Level Guide comparison grid.
 *
 * standardLevels — ordered list of benchmark levels (rows)
 * companies      — list of selected companies (columns), with their logo/website
 * grid           — map of standardLevelId → map of companyId → internal title
 *                  null entry means company has no mapping for that standard level
 */
@Data
public class GuideLevelGridResponse {

    private List<StandardLevelRow> standardLevels;
    private List<CompanyCol>       companies;
    // key1 = standardLevelId, key2 = companyId, value = GridCell (title + functionCategory)
    private Map<String, Map<String, GridCell>> grid;

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

    /** A single cell in the grid — the company's internal title for a given standard level. */
    @Data
    public static class GridCell {
        private String title;
        private String functionCategory; // "Engineering" | "Product" | "Program"
    }
}
