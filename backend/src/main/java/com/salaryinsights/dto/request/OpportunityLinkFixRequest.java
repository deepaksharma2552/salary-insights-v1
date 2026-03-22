package com.salaryinsights.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OpportunityLinkFixRequest {

    @NotBlank(message = "Apply link is required")
    private String applyLink;
}
