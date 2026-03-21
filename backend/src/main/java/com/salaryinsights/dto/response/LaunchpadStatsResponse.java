package com.salaryinsights.dto.response;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class LaunchpadStatsResponse {
    private long codingProblems;
    private long systemDesignQuestions;
    private long articles;
    private long interviewExperiences;
    private long pendingReview;
    private long pausedExperiences;
}
