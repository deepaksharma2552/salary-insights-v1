package com.salaryinsights.dto.response;

import com.salaryinsights.enums.ReferralStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ReferralResponse {

    private UUID   id;
    private String companyName;    // resolved: FK company name or companyNameRaw
    private String referralLink;
    private ReferralStatus status;
    private String adminNote;      // shown to the submitter on rejection

    private String referredByName;  // firstName + lastName
    private String referredByEmail;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
