package com.salaryinsights.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class FunctionLevelRequest {

    @NotNull
    private UUID jobFunctionId;

    @NotBlank(message = "Level name is required")
    private String name;

    @NotNull @Min(0)
    private Integer sortOrder;

    /**
     * Optional FK to standardized_levels.id — null means no cross-function mapping.
     * Replaces the old InternalLevel enum field.
     */
    private UUID standardizedLevelId;
}
