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
    private String candidateName;
    private String candidateEmail;
    private String jobTitle;

    /** Resolved company name — from the FK relationship or the free-text fallback. */
    private String companyName;

    private String        note;
    private ReferralStatus status;
    private String        adminNote;

    private String referredByName;   // firstName + lastName of the submitting user
    private String referredByEmail;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
