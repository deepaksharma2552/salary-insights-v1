package com.salaryinsights.dto.request;

import com.salaryinsights.enums.LaunchpadRoundType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class LaunchpadExperienceRequest {
    private UUID   companyId;
    private String companyName;    // fallback if no companyId
    @NotNull  private LaunchpadRoundType roundType;
    private Integer year;
    private Boolean gotOffer;
    @NotBlank private String experience;
    private List<String> questions;
}
