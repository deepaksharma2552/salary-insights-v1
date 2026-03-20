package com.salaryinsights.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class GuideMappingRequest {

    @NotNull(message = "Company level ID is required")
    private UUID guideCompanyLevelId;

    @NotNull(message = "Standard level ID is required")
    private UUID guideStandardLevelId;
}
