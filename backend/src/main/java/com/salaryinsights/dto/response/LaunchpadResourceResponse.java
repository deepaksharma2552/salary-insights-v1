package com.salaryinsights.dto.response;

import com.salaryinsights.enums.LaunchpadDifficulty;
import com.salaryinsights.enums.LaunchpadResourceType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data @Builder
public class LaunchpadResourceResponse {
    private UUID id;
    private LaunchpadResourceType type;
    private String title;
    private LaunchpadDifficulty difficulty;
    private String topic;
    private List<String> companies;
    private String link;
    private String description;
    private boolean active;
    private int sortOrder;
    private LocalDateTime createdAt;
}
