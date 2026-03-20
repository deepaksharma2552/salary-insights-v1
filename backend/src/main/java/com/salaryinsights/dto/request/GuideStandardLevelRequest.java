package com.salaryinsights.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GuideStandardLevelRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotNull(message = "Rank is required")
    @Min(value = 1, message = "Rank must be at least 1")
    private Integer rank;

    private String description;
}
