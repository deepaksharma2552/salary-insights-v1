package com.salaryinsights.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class AdminDashboardResponse {
    private long totalCompanies;
    private long activeCompanies;
    private long pendingReviews;
    private long totalSalaryEntries;
    private long approvedEntries;
    private long rejectedEntries;
    private Double avgBaseSalary;
    private List<Map<String, Object>> submissionTrend;
    private List<Map<String, Object>> weeklyTrend;  // null unless year+month requested
}
