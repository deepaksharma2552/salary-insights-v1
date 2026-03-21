package com.salaryinsights.dto.response;

import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class GuideCompanyLevelResponse {
    private UUID   id;
    private UUID   companyId;
    private String companyName;
    private String title;
    private String description;
    private String functionCategory;

    /** All overlap mappings for this company level. Empty = not yet mapped. */
    private List<MappingEntry> mappings;

    @Data
    public static class MappingEntry {
        private UUID    standardLevelId;
        private String  standardLevelName;
        private Integer standardLevelRank;
        private Integer overlapPct;
    }
}
