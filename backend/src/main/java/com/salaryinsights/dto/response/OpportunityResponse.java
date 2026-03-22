package com.salaryinsights.dto.response;

import com.salaryinsights.enums.OpportunityStatus;
import com.salaryinsights.enums.OpportunityType;
import com.salaryinsights.enums.WorkMode;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class OpportunityResponse {

    private UUID   id;
    private String title;
    private String companyName;
    private UUID   companyId;

    private OpportunityType   type;
    private String            role;
    private String            location;
    private WorkMode          workMode;
    private String            applyLink;
    private String            stipendOrSalary;
    private String            experienceRequired;
    private LocalDate         deadline;
    private String            description;

    private OpportunityStatus status;
    private String            rejectionReason;

    private String postedByName;
    private String postedByEmail;

    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
