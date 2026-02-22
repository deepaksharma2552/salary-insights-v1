package com.salaryinsights.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class AiRefreshResult {

    private String status; // SUCCESS | PARTIAL | FAILED

    private int companiesProcessed;
    private int newSalariesAdded;
    private int salariesUpdated;
    private int levelsDetected;
    private int mappingSuggestions;

    private List<CompanyRefreshSummary> companyResults;
    private List<MappingSuggestion> mappingSuggestionList;

    private String message;
    private long durationMs;
    private LocalDateTime completedAt;

    @Data
    @Builder
    public static class CompanyRefreshSummary {
        private String companyId;
        private String companyName;
        private int newSalaries;
        private int newLevels;
        private String status;
        private String error;
    }

    @Data
    @Builder
    public static class MappingSuggestion {
        private String companyName;
        private String companyId;
        private String internalLevelName;
        private String suggestedStandardizedLevel;
        private String reasoning;
        private double confidence; // 0.0 - 1.0
    }
}
