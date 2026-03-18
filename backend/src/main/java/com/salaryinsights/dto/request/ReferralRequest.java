package com.salaryinsights.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class ReferralRequest {

    /** ID of an existing company selected from autocomplete — nullable if new company. */
    private UUID companyId;

    /**
     * Company name typed by the user.
     * Used to auto-create the company when companyId is null,
     * exactly as in SalaryRequest.
     */
    @Size(max = 255)
    private String companyName;

    /** Direct referral or job application URL — required. */
    @NotBlank(message = "Referral link is required")
    private String referralLink;
}
