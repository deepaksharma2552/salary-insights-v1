package com.salaryinsights.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * AuditLogArchivalJob
 *
 * Runs nightly at 02:00 server time and moves audit log rows older than
 * {@code app.audit.archive-after-days} (default: 90) from audit_logs into
 * audit_logs_archive in batches of {@code app.audit.archive-batch-size}
 * (default: 1000).
 *
 * Why batched:
 *   A single DELETE of 50,000+ rows holds a table lock for seconds and can
 *   spike replication lag. Processing 1,000 rows per batch keeps each
 *   transaction short (~5–10ms), releasing locks between iterations.
 *
 * Why 02:00:
 *   Lowest traffic window. The job self-terminates once no more rows match
 *   the cutoff so it won't run for long on most nights.
 *
 * How to configure (application.yml or env vars):
 *   app.audit.archive-after-days: 90     # rows older than N days are archived
 *   app.audit.archive-batch-size: 1000   # rows moved per transaction
 *   app.audit.archive-enabled: true      # set to false to disable without redeploying
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AuditLogArchivalJob {

    private final AuditLogService auditLogService;

    @Value("${app.audit.archive-after-days:90}")
    private int archiveAfterDays;

    @Value("${app.audit.archive-batch-size:1000}")
    private int batchSize;

    @Value("${app.audit.archive-enabled:true}")
    private boolean enabled;

    /**
     * Runs at 02:00 every night.
     * Cron: second minute hour day-of-month month day-of-week
     */
    @Scheduled(cron = "0 0 2 * * *")
    public void run() {
        if (!enabled) {
            log.debug("[AuditArchival] Archival disabled via app.audit.archive-enabled=false");
            return;
        }

        LocalDateTime cutoff = LocalDateTime.now().minusDays(archiveAfterDays);
        log.info("[AuditArchival] Starting archival run — cutoff={} batchSize={}", cutoff, batchSize);

        int totalArchived = 0;
        int iterations    = 0;
        int archived;

        do {
            archived = auditLogService.archiveBefore(cutoff, batchSize);
            totalArchived += archived;
            iterations++;

            // Safety valve — if somehow millions of rows need moving, cap at
            // 500 batches (500k rows) per run and let the next night finish the rest.
            if (iterations >= 500) {
                log.warn("[AuditArchival] Reached 500-batch safety cap. {} rows archived this run. " +
                         "Remaining rows will be processed on the next scheduled run.", totalArchived);
                break;
            }
        } while (archived == batchSize); // if a full batch came back, there may be more

        if (totalArchived > 0) {
            log.info("[AuditArchival] Completed — {} rows archived in {} batches", totalArchived, iterations);
        } else {
            log.debug("[AuditArchival] Nothing to archive (no rows older than {})", cutoff);
        }
    }
}
