package com.salaryinsights.dto.request;

import com.salaryinsights.enums.CompanyLevelCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class CompanyRequest {
    @NotBlank @Size(max = 255)
    private String name;

    @Size(max = 100)
    private String industry;

    @Size(max = 255)
    private String location;

    @Size(max = 50)
    private String companySize;

    private CompanyLevelCategory companyLevelCategory;

    @Size(max = 500)
    private String website;

    @Size(max = 500)
    private String logoUrl;

    /** Admin-managed benefits with optional amounts. */
    private java.util.List<com.salaryinsights.dto.response.BenefitItem> benefits;
}
