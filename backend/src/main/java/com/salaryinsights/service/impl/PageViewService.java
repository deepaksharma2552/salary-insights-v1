package com.salaryinsights.service.impl;

import com.salaryinsights.entity.PageViewEvent;
import com.salaryinsights.repository.PageViewDailyRepository;
import com.salaryinsights.repository.PageViewEventRepository;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class PageViewService {

    private final PageViewEventRepository eventRepository;
    private final PageViewDailyRepository dailyRepository;
    private final DataSource             dataSource;

    @Value("${app.analytics.aggregate-batch-size:5000}")
    private int batchLimit;

    @Value("${app.analytics.aggregate-enabled:true}")
    private boolean aggregateEnabled;

    public PageViewService(PageViewEventRepository eventRepository,
                           PageViewDailyRepository dailyRepository,
                           DataSource dataSource) {
        this.eventRepository = eventRepository;
        this.dailyRepository  = dailyRepository;
        this.dataSource       = dataSource;
    }

    // ── Record a page view — fire-and-forget, never blocks request ────────────

    @Async("trackingExecutor")
    public void record(String page, String ipAddress, String userAgent, String referrer) {
        try {
            String sessionHash = hashSession(ipAddress, userAgent);
            doRecord(normalisePage(page), sessionHash, referrer);
        } catch (Exception e) {
            log.warn("Failed to record page view for '{}': {}", page, e.getMessage());
        }
    }

    @Transactional
    public void doRecord(String page, String sessionHash, String referrer) {
        PageViewEvent event = PageViewEvent.builder()
                .page(page)
                .sessionHash(sessionHash)
                .referrer(referrer != null && referrer.length() > 500
                        ? referrer.substring(0, 500) : referrer)
                .build();
        eventRepository.save(event);
    }

    // ── Hourly aggregation job ─────────────────────────────────────────────────

    @Scheduled(fixedRateString = "${app.analytics.aggregate-interval-ms:3600000}")
    @Transactional
    public void aggregateHourly() {
        if (!aggregateEnabled) {
            log.debug("PageView aggregation disabled via app.analytics.aggregate-enabled");
            return;
        }
        log.info("PageView aggregation job starting");
        long start = System.currentTimeMillis();

        // Partition DDL runs via raw JDBC — completely outside the JPA transaction.
        // DDL inside a JPA transaction corrupts Hibernate session state and causes
        // cryptic rollback errors. See ensureNextMonthPartition() javadoc.
        ensureNextMonthPartition();

        OffsetDateTime cutoff = OffsetDateTime.now().minusMinutes(1);

        List<PageViewEvent> events = eventRepository.findUnprocessed(cutoff, batchLimit);
        if (events.isEmpty()) {
            log.info("PageView aggregation: no unprocessed events");
            return;
        }

        // Group by (page, date)
        Map<String, Long>        viewCounts  = new LinkedHashMap<>();
        Map<String, Set<String>> sessionSets = new LinkedHashMap<>();

        for (PageViewEvent e : events) {
            String key = e.getPage() + "::" + e.getCreatedAt().toLocalDate();
            viewCounts.merge(key, 1L, Long::sum);
            sessionSets.computeIfAbsent(key, k -> new HashSet<>()).add(e.getSessionHash());
        }

        // UPSERT each (page, date) bucket
        for (Map.Entry<String, Long> entry : viewCounts.entrySet()) {
            String[]  parts          = entry.getKey().split("::");
            String    page           = parts[0];
            LocalDate date           = LocalDate.parse(parts[1]);
            long      views          = entry.getValue();
            long      uniqueSessions = sessionSets.getOrDefault(entry.getKey(), Collections.emptySet()).size();
            dailyRepository.upsertCounts(page, date, views, uniqueSessions);
        }

        // Bulk-mark all processed events
        String idArray = events.stream()
                .map(e -> e.getId().toString())
                .collect(Collectors.joining(","));
        eventRepository.markProcessed("{" + idArray + "}");

        log.info("PageView aggregation: processed {} events in {}ms",
                events.size(), System.currentTimeMillis() - start);
    }

    // ── Dashboard queries ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getPageStats(LocalDate from, LocalDate to) {
        return dailyRepository.sumByPageBetween(from, to).stream()
                .map(row -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("page",           row[0]);
                    m.put("views",          row[1]);
                    m.put("uniqueSessions", row[2]);
                    return m;
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getDailyTotals(LocalDate from, LocalDate to) {
        return dailyRepository.dailyTotalsBetween(from, to).stream()
                .map(row -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("date",           row[0]);
                    m.put("views",          row[1]);
                    m.put("uniqueSessions", row[2]);
                    return m;
                })
                .collect(Collectors.toList());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Create next month's partition using a raw JDBC connection — intentionally
     * outside any JPA/Spring transaction.
     *
     * Why not EntityManager or @Transactional:
     *   1. Spring cannot proxy private methods — @Transactional on a private method
     *      is silently ignored, so entityManager.executeUpdate() throws
     *      "no active transaction".
     *   2. Running CREATE TABLE inside the same JPA transaction as the DML upserts
     *      corrupts Hibernate's session state, rolling back the whole aggregation.
     *   3. Raw JDBC with autoCommit=true lets the DDL commit independently — exactly
     *      what Postgres partition creation requires.
     */
    private void ensureNextMonthPartition() {
        String sql = """
            DO $do$
            DECLARE
                partition_name TEXT;
                start_date     DATE := DATE_TRUNC('month', NOW() + INTERVAL '1 month');
                end_date       DATE := DATE_TRUNC('month', NOW() + INTERVAL '2 months');
            BEGIN
                partition_name := 'page_view_events_' || TO_CHAR(start_date, 'YYYY_MM');
                IF NOT EXISTS (
                    SELECT 1 FROM pg_class WHERE relname = partition_name
                ) THEN
                    EXECUTE FORMAT(
                        'CREATE TABLE %I PARTITION OF page_view_events FOR VALUES FROM (%L) TO (%L)',
                        partition_name, start_date, end_date
                    );
                END IF;
            END $do$;
            """;
        try (Connection conn = dataSource.getConnection();
             Statement  stmt = conn.createStatement()) {
            conn.setAutoCommit(true);
            stmt.execute(sql);
        } catch (Exception e) {
            log.warn("Partition creation skipped: {}", e.getMessage());
        }
    }

    /** SHA-256(ip + ua + today's date) — unique per visitor per day, no PII stored */
    private String hashSession(String ip, String ua) {
        try {
            String raw = (ip == null ? "" : ip)
                    + "|" + (ua  == null ? "" : ua)
                    + "|" + LocalDate.now();
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return UUID.randomUUID().toString().replace("-", "");
        }
    }

    /** Normalise page path — strip query params, lowercase, limit length */
    private String normalisePage(String page) {
        if (page == null) return "/";
        int q = page.indexOf('?');
        String path = q >= 0 ? page.substring(0, q) : page;
        path = path.toLowerCase().trim();
        if (path.isEmpty()) path = "/";
        return path.length() > 255 ? path.substring(0, 255) : path;
    }
}
