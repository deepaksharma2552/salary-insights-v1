package com.salaryinsights.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class GuideCompanyLevelRequest {

    @NotNull(message = "Company ID is required")
    private UUID companyId;

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    /**
     * Job function track — e.g. "Engineering", "Product", "Program".
     * Defaults to "Engineering" if not supplied.
     */
    private String functionCategory;
}
