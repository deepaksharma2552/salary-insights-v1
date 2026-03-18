package com.salaryinsights.dto.request;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class ReferralRequest {

    private UUID companyId;

    @Size(max = 255)
    private String companyName;

    @NotBlank(message = "Referral link is required")
    private String referralLink;

    /**
     * Optional expiry date chosen by the user.
     * If null, backend defaults to 30 days from now.
     * Must be a future date if supplied.
     */
    @Future(message = "Expiry date must be in the future")
    private LocalDateTime expiresAt;
}
