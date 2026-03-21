package com.salaryinsights.dto.request;

import com.salaryinsights.enums.LaunchpadDifficulty;
import com.salaryinsights.enums.LaunchpadResourceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class LaunchpadResourceRequest {
    @NotNull  private LaunchpadResourceType type;
    @NotBlank private String title;
    private LaunchpadDifficulty difficulty;
    private String topic;
    private List<String> companies;
    private String link;
    private String description;
    private Integer sortOrder;
}
