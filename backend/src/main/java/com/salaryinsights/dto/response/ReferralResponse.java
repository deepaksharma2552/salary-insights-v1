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
    private UUID   companyId;
    private String companyName;
    private String website;
    private String referralLink;
    private ReferralStatus status;
    private String adminNote;

    private String referredByName;
    private String referredByEmail;

    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
