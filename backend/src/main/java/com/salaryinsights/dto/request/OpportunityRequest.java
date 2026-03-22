package com.salaryinsights.dto.request;

import com.salaryinsights.enums.OpportunityType;
import com.salaryinsights.enums.WorkMode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class OpportunityRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must be under 200 characters")
    private String title;

    @NotBlank(message = "Company name is required")
    @Size(max = 200)
    private String companyName;

    /** Optional — links to existing company in DB for logo resolution. */
    private UUID companyId;

    @NotNull(message = "Opportunity type is required")
    private OpportunityType type;

    @Size(max = 200)
    private String role;

    @Size(max = 100)
    private String location;

    private WorkMode workMode = WorkMode.ONSITE;

    @NotBlank(message = "Apply link is required")
    private String applyLink;

    @Size(max = 100)
    private String stipendOrSalary;

    @Size(max = 100)
    private String experienceRequired;

    /** Optional deadline — if provided, expires_at = deadline midnight. */
    private LocalDate deadline;

    @Size(max = 2000)
    private String description;
}
