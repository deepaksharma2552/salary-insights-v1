package com.salaryinsights.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class StandardizedLevelRequest {
    @NotBlank
    private String name;

    @NotNull
    private Integer hierarchyRank;
}
