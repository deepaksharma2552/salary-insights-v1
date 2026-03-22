package com.salaryinsights.dto.response;

import com.salaryinsights.enums.CompanyLevelCategory;
import com.salaryinsights.enums.CompanyStatus;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class CompanyResponse {
    private UUID   id;
    private String name;
    private String industry;
    private String location;
    private String companySize;
    private CompanyLevelCategory companyLevelCategory;
    private String website;
    private String logoUrl;
    private CompanyStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** Admin-managed benefits with optional amounts. */
    private java.util.List<com.salaryinsights.dto.response.BenefitItem> benefits;

    // Aggregated salary stats — populated when fetching for public display
    private Long   entryCount;
    private Double avgBaseSalary;
    private Double avgTotalCompensation;

    /** TC range across all levels — shown on card without extra call. */
    private BigDecimal tcMin;
    private BigDecimal tcMax;
}
