package com.salaryinsights.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Runs every hour and flips LIVE opportunities whose expiresAt has passed
 * to EXPIRED. Single UPDATE — safe at any volume.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OpportunityExpiryJob {

    private final OpportunityService opportunityService;

    @Scheduled(cron = "0 0 * * * *")
    public void run() {
        int expired = opportunityService.expireStale();
        if (expired > 0) {
            log.info("[OpportunityExpiry] Marked {} opportunities as EXPIRED", expired);
        }
    }
}
