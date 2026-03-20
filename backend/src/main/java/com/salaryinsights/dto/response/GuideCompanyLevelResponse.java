package com.salaryinsights.dto.response;

import lombok.Data;
import java.util.UUID;

@Data
public class GuideCompanyLevelResponse {
    private UUID   id;
    private UUID   companyId;
    private String companyName;
    private String title;
    private String description;
    // null if not yet mapped
    private UUID   mappedStandardLevelId;
    private String mappedStandardLevelName;
    private Integer mappedStandardLevelRank;
}
