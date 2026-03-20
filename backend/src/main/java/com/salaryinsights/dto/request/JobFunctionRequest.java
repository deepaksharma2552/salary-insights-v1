package com.salaryinsights.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class JobFunctionRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Display name is required")
    private String displayName;

    @NotNull @Min(0)
    private Integer sortOrder;
}
