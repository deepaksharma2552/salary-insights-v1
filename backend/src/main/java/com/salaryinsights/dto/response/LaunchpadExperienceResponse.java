package com.salaryinsights.dto.response;

import com.salaryinsights.enums.LaunchpadRoundType;
import com.salaryinsights.enums.LaunchpadStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data @Builder
public class LaunchpadExperienceResponse {
    private UUID id;
    private UUID   companyId;
    private String companyName;
    private String submittedByName;
    private LaunchpadRoundType roundType;
    private Integer year;
    private Boolean gotOffer;
    private String experience;
    private List<String> questions;
    private LaunchpadStatus status;
    private String adminNote;
    private boolean active;
    private LocalDateTime createdAt;
}
