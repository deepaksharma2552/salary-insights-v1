package com.salaryinsights.dto.response;

import com.salaryinsights.enums.ExperienceLevel;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class StandardizedLevelResponse {
    private UUID id;
    private String name;
    private Integer hierarchyRank;
    private String description;
    private ExperienceLevel experienceLevel;
    private LocalDateTime createdAt;
}
