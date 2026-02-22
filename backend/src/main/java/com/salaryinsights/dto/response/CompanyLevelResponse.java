package com.salaryinsights.dto.response;

import lombok.Data;

import java.util.UUID;

@Data
public class CompanyLevelResponse {
    private UUID id;
    private UUID companyId;
    private String companyName;
    private String internalLevelName;
    private UUID standardizedLevelId;
    private String standardizedLevelName;
    private Integer hierarchyRank;
}
