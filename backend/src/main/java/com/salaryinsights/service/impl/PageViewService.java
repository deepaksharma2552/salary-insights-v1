package com.salaryinsights.service.impl;

import com.salaryinsights.entity.PageViewEvent;
import com.salaryinsights.repository.PageViewDailyRepository;
import com.salaryinsights.repository.PageViewEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PageViewService {

    private final PageViewEventRepository eventRepository;
    private final PageViewDailyRepository dailyRepository;

    private static final int BATCH_LIMIT = 5000; // max events per job run

    // ── Record a page view — fire-and-forget, never blocks request ────────────

    @Async("trackingExecutor")
    @Transactional
    public void record(String page, String ipAddress, String userAgent, String referrer) {
        try {
            String sessionHash = hashSession(ipAddress, userAgent);
            PageViewEvent event = PageViewEvent.builder()
                    .page(normalisePage(page))
                    .sessionHash(sessionHash)
                    .referrer(referrer != null && referrer.length() > 500
                            ? referrer.substring(0, 500) : referrer)
                    .build();
            eventRepository.save(event);
        } catch (Exception e) {
            log.warn("Failed to record page view for '{}': {}", page, e.getMessage());
            // Silently swallow — tracking must never affect the main request
        }
    }

    // ── Hourly aggregation job ─────────────────────────────────────────────────

    @Scheduled(fixedRate = 3_600_000) // every 1 hour in ms
    @Transactional
    public void aggregateHourly() {
        log.debug("PageView aggregation job starting");
        long start = System.currentTimeMillis();

        // Ensure next month's partition exists (idempotent)
        eventRepository.ensureNextMonthPartition();

        // Only process events from before 1 minute ago — avoids edge cases
        // with events written mid-second while we're reading
        OffsetDateTime cutoff = OffsetDateTime.now().minusMinutes(1);

        List<PageViewEvent> events = eventRepository.findUnprocessed(cutoff, BATCH_LIMIT);
        if (events.isEmpty()) {
            log.debug("PageView aggregation: no unprocessed events");
            return;
        }

        // Group by (page, date) and count views + unique sessions
        // Map key: "page::date"
        Map<String, Long>   viewCounts    = new LinkedHashMap<>();
        Map<String, Long>   sessionCounts = new LinkedHashMap<>();
        Map<String, Set<String>> sessionSets = new LinkedHashMap<>();

        for (PageViewEvent e : events) {
            String key  = e.getPage() + "::" + e.getCreatedAt().toLocalDate();
            viewCounts.merge(key, 1L, Long::sum);
            sessionSets.computeIfAbsent(key, k -> new HashSet<>()).add(e.getSessionHash());
        }

        // Derive unique session counts from sets
        sessionSets.forEach((key, sessions) ->
                sessionCounts.put(key, (long) sessions.size()));

        // UPSERT each (page, date) bucket
        for (Map.Entry<String, Long> entry : viewCounts.entrySet()) {
            String[] parts = entry.getKey().split("::");
            String    page = parts[0];
            LocalDate date = LocalDate.parse(parts[1]);
            long views          = entry.getValue();
            long uniqueSessions = sessionCounts.getOrDefault(entry.getKey(), 0L);
            dailyRepository.upsertCounts(page, date, views, uniqueSessions);
        }

        // Bulk-mark all processed events in a single UPDATE
        String idArray = events.stream()
                .map(e -> e.getId().toString())
                .collect(Collectors.joining(","));
        eventRepository.markProcessed("{" + idArray + "}");

        log.info("PageView aggregation: processed {} events in {}ms",
                events.size(), System.currentTimeMillis() - start);
    }

    // ── Dashboard queries — always read from page_view_daily ─────────────────

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
