package com.salaryinsights.dto.request;

import lombok.Data;

import java.util.UUID;

@Data
public class AiRefreshRequest {
    private UUID companyId;   // null = refresh all active companies
    private boolean dryRun = false;  // if true: suggest but don't persist
}
