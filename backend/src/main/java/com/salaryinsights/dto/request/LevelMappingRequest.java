package com.salaryinsights.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class LevelMappingRequest {
    @NotNull
    private UUID companyLevelId;

    @NotNull
    private UUID standardizedLevelId;
}
