package com.salaryinsights.dto.response;

import lombok.Data;
import java.util.List;
import java.util.Map;
import java.util.UUID;

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
    // key1 = standardLevelId, key2 = companyId, value = internal title
    private Map<String, Map<String, String>> grid;

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
}
