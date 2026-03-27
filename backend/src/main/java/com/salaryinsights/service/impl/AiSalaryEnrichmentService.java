package com.salaryinsights.service.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.salaryinsights.dto.request.SalaryRequest;
import com.salaryinsights.dto.response.AiSalaryData;
import com.salaryinsights.dto.response.AiSalaryData.AiSalaryEntry;
import com.salaryinsights.enums.EmploymentType;
import com.salaryinsights.enums.ExperienceLevel;
import com.salaryinsights.enums.Location;
import com.salaryinsights.service.impl.AuditLogService;
import com.salaryinsights.service.impl.SalaryService;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * AiSalaryEnrichmentService
 *
 * Async version — the Claude + web_search call takes 15-60 s and would 504
 * on Railway's gateway if run synchronously.
 *
 * Flow:
 *  1. submitEnrichJob()  -> validates rate limit, creates a job record (RUNNING),
 *                           fires enrichAsync() on the "enrichExecutor" thread pool,
 *                           returns the jobId immediately.
 *  2. enrichAsync()      -> calls Claude, inserts entries, updates job to DONE/FAILED.
 *  3. getJob()           -> polled by the frontend every 2 s until status != RUNNING.
 *
 * Job records are kept in-memory and auto-expire after 2 hours.
 */
@Slf4j
@Service
public class AiSalaryEnrichmentService {

    private static final int  MAX_ENTRIES       = 20;
    private static final long RATE_LIMIT_MILLIS = 60 * 60 * 1_000L;      // 1 hour
    private static final long JOB_TTL_MILLIS    = 2  * 60 * 60 * 1_000L; // 2 hours

    private final ConcurrentHashMap<String, Long>      lastEnrichmentTime = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, EnrichJob> jobs               = new ConcurrentHashMap<>();

    private final RestTemplate    restTemplate;
    private final ObjectMapper    objectMapper;
    private final SalaryService   salaryService;
    private final AuditLogService auditLogService;

    @Value("${anthropic.api.key}")
    private String anthropicApiKey;

    private static final String CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
    private static final String CLAUDE_MODEL   = "claude-sonnet-4-20250514";

    // Explicit constructor so we can @Qualifier the RestTemplate
    public AiSalaryEnrichmentService(
            @Qualifier("anthropicRestTemplate") RestTemplate restTemplate,
            ObjectMapper objectMapper,
            SalaryService salaryService,
            AuditLogService auditLogService) {
        this.restTemplate    = restTemplate;
        this.objectMapper    = objectMapper;
        this.salaryService   = salaryService;
        this.auditLogService = auditLogService;
    }

    // ── Job model ──────────────────────────────────────────────────────────────

    public enum JobStatus { RUNNING, DONE, FAILED }

    @Data
    public static class EnrichJob {
        private final String     jobId;
        private final String     companyName;
        private volatile JobStatus status  = JobStatus.RUNNING;
        private volatile int     inserted  = 0;
        private volatile String  error     = null;
        private final long       createdAt = Instant.now().toEpochMilli();
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    /**
     * Validates rate limit, creates a RUNNING job, fires async work,
     * returns the jobId immediately — no waiting.
     */
    public EnrichJob submitEnrichJob(String companyName) {
        String key = companyName.trim().toLowerCase();

        Long last = lastEnrichmentTime.get(key);
        if (last != null && (Instant.now().toEpochMilli() - last) < RATE_LIMIT_MILLIS) {
            long minutesLeft = (RATE_LIMIT_MILLIS - (Instant.now().toEpochMilli() - last)) / 60_000;
            throw new IllegalStateException(
                "Rate limit: already enriched \"" + companyName + "\" recently. "
                + "Try again in ~" + minutesLeft + " minute(s).");
        }

        // Stamp rate limit immediately so rapid double-clicks don't both get through
        lastEnrichmentTime.put(key, Instant.now().toEpochMilli());

        evictExpiredJobs();

        String jobId = UUID.randomUUID().toString();
        EnrichJob job = new EnrichJob(jobId, companyName.trim());
        jobs.put(jobId, job);

        log.info("[AI Enrich] Job {} created for: {}", jobId, companyName);
        auditLogService.log("AiEnrichment", companyName, "ENRICH_STARTED",
            "AI enrichment job " + jobId + " started for: " + companyName);

        enrichAsync(job);
        return job;
    }

    /** Returns a job by ID, or null if it has expired / never existed. */
    public EnrichJob getJob(String jobId) {
        return jobs.get(jobId);
    }

    // ── Async enrichment ───────────────────────────────────────────────────────

    @Async("enrichExecutor")
    public void enrichAsync(EnrichJob job) {
        try {
            AiSalaryData aiData = callClaudeApi(job.getCompanyName());

            if (aiData == null || aiData.getEntries() == null || aiData.getEntries().isEmpty()) {
                log.warn("[AI Enrich] Job {} — no entries returned for: {}", job.getJobId(), job.getCompanyName());
                job.setError("Claude returned no salary data for this company.");
                job.setStatus(JobStatus.FAILED);
                return;
            }

            List<AiSalaryEntry> entries = aiData.getEntries();
            if (entries.size() > MAX_ENTRIES) {
                log.info("[AI Enrich] Job {} — capping {} to {}", job.getJobId(), entries.size(), MAX_ENTRIES);
                entries = entries.subList(0, MAX_ENTRIES);
            }

            Location parentLocation = resolveLocationFromString(aiData.getLocation());

            int inserted = 0;
            for (AiSalaryEntry aiEntry : entries) {
                try {
                    SalaryRequest req = mapToSalaryRequest(
                        aiEntry, job.getCompanyName(), aiData.getDataSource(), parentLocation);
                    salaryService.submitSalary(req);
                    inserted++;
                } catch (Exception e) {
                    log.warn("[AI Enrich] Job {} — failed to insert '{}': {}",
                        job.getJobId(), aiEntry.getJobTitle(), e.getMessage());
                }
            }

            job.setInserted(inserted);
            job.setStatus(JobStatus.DONE);

            log.info("[AI Enrich] Job {} DONE — {}/{} entries for: {}",
                job.getJobId(), inserted, entries.size(), job.getCompanyName());
            auditLogService.log("AiEnrichment", job.getCompanyName(), "ENRICH_COMPLETED",
                String.format("Job %s: %d entries queued as PENDING. Source: %s",
                    job.getJobId(), inserted, aiData.getDataSource()));

        } catch (Exception e) {
            log.error("[AI Enrich] Job {} FAILED for {}: {}",
                job.getJobId(), job.getCompanyName(), e.getMessage(), e);
            job.setError("Enrichment failed: " + e.getMessage());
            job.setStatus(JobStatus.FAILED);
        }
    }

    // ── Claude API call ────────────────────────────────────────────────────────

    private AiSalaryData callClaudeApi(String companyName) {
        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("model", CLAUDE_MODEL);
        requestBody.put("max_tokens", 4096);
        requestBody.put("tools", List.of(
            Map.of("type", "web_search_20250305", "name", "web_search")
        ));
        requestBody.put("messages", List.of(
            Map.of("role", "user", "content", buildPrompt(companyName))
        ));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-api-key", anthropicApiKey);
        headers.set("anthropic-version", "2023-06-01");

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(
                CLAUDE_API_URL, new HttpEntity<>(requestBody, headers), Map.class);

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                log.error("[AI Enrich] Claude API non-2xx: {}", response.getStatusCode());
                return null;
            }

            return parseClaudeResponse(response.getBody(), companyName);

        } catch (Exception e) {
            log.error("[AI Enrich] Claude API call failed for {}: {}", companyName, e.getMessage(), e);
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private AiSalaryData parseClaudeResponse(Map<String, Object> body, String companyName) {
        try {
            List<Map<String, Object>> content = (List<Map<String, Object>>) body.get("content");
            if (content == null || content.isEmpty()) return null;

            // Scan backwards for the last text block — Claude emits tool_use/tool_result
            // blocks before its final JSON answer.
            String jsonText = null;
            for (int i = content.size() - 1; i >= 0; i--) {
                Map<String, Object> block = content.get(i);
                if ("text".equals(block.get("type"))) {
                    jsonText = (String) block.get("text");
                    break;
                }
            }

            if (jsonText == null || jsonText.isBlank()) {
                log.warn("[AI Enrich] No text block in Claude response for: {}", companyName);
                return null;
            }

            jsonText = jsonText.trim();
            if (jsonText.startsWith("```")) {
                jsonText = jsonText.replaceAll("(?s)^```[a-z]*\\n?", "").replaceAll("(?s)```$", "").trim();
            }

            AiSalaryData data = objectMapper.readValue(jsonText, AiSalaryData.class);
            log.info("[AI Enrich] Parsed {} entries for: {}",
                data.getEntries() != null ? data.getEntries().size() : 0, companyName);
            return data;

        } catch (Exception e) {
            log.error("[AI Enrich] Failed to parse Claude JSON for {}: {}", companyName, e.getMessage());
            return null;
        }
    }

    // ── Prompt ─────────────────────────────────────────────────────────────────

    private String buildPrompt(String companyName) {
        return """
            You are a salary data researcher for an Indian salary transparency platform.
            Search the web for real, current salary data for "%s" employees working in India.

            Focus on these Indian cities: Bengaluru, Hyderabad, Pune, Delhi NCR, Kochi, Coimbatore, Mysore, Mangaluru.
            Target software engineering, data, product, and design roles. Look at sources like:
            levels.fyi, glassdoor, linkedin, ambitionbox, iimjobs, naukri, payscale.

            Return ONLY valid JSON — no prose, no markdown code fences, no explanation before or after.
            The JSON must exactly match this shape:

            {
              "companyName": "%s",
              "location": "<primary Indian city where most data was found>",
              "dataSource": "<comma-separated sources used, e.g. levels.fyi, glassdoor>",
              "entries": [
                {
                  "jobTitle": "<e.g. Software Engineer>",
                  "department": "<e.g. Engineering, Data Science, Product>",
                  "internalLevel": "<company-specific level e.g. L4, SDE-II, IC3, or null if unknown>",
                  "experienceLevel": "<MUST be exactly one of: INTERN, ENTRY, MID, SENIOR, LEAD, MANAGER, DIRECTOR, VP, C_LEVEL>",
                  "employmentType": "<MUST be exactly one of: FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, FREELANCE>",
                  "baseSalary": <annual base salary in INR as integer, e.g. 2500000>,
                  "bonus": <annual bonus in INR as integer, or null>,
                  "equity": <annual equity/ESOP value in INR as integer, or null>,
                  "currency": "INR",
                  "notes": "<brief context e.g. median for 3-5 yoe in Bengaluru>"
                }
              ]
            }

            Critical rules:
            - ALL salary values MUST be in INR (Indian Rupees), annual amounts
            - Include 8-20 diverse role/level combinations covering different seniority bands
            - experienceLevel MUST be exactly one of the listed enum values — no other values
            - employmentType MUST be exactly one of the listed enum values — no other values
            - baseSalary must be a positive integer, never null or zero
            - Do NOT include any text, explanation, or markdown outside the JSON object
            """.formatted(companyName, companyName);
    }

    // ── Mapping ────────────────────────────────────────────────────────────────

    private SalaryRequest mapToSalaryRequest(AiSalaryEntry aiEntry,
                                              String companyName,
                                              String dataSource,
                                              Location parentLocation) {
        SalaryRequest req = new SalaryRequest();
        req.setCompanyName(companyName);
        req.setJobTitle(aiEntry.getJobTitle() != null ? aiEntry.getJobTitle().trim() : "Unknown Role");
        req.setDepartment(aiEntry.getDepartment());

        if (aiEntry.getExperienceLevel() != null) {
            try {
                req.setExperienceLevel(ExperienceLevel.valueOf(
                    aiEntry.getExperienceLevel().trim().toUpperCase()));
            } catch (IllegalArgumentException ignored) {}
        }

        req.setLocation(parentLocation);

        BigDecimal base = aiEntry.getBaseSalary();
        if (base == null || base.compareTo(BigDecimal.valueOf(100_000)) < 0) {
            base = BigDecimal.valueOf(500_000);
        }
        req.setBaseSalary(base);
        req.setBonus(aiEntry.getBonus());
        req.setEquity(aiEntry.getEquity());

        EmploymentType empType = EmploymentType.FULL_TIME;
        if (aiEntry.getEmploymentType() != null) {
            try {
                empType = EmploymentType.valueOf(aiEntry.getEmploymentType().trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }
        req.setEmploymentType(empType);

        auditLogService.log("SalaryEntry", companyName, "AI_ENTRY_MAPPED",
            String.format("[AI:%s] %s | internalLevel=%s | experienceLevel=%s | base=%.0f INR",
                dataSource != null ? dataSource : "ai_inference",
                req.getJobTitle(),
                aiEntry.getInternalLevel() != null ? aiEntry.getInternalLevel() : "n/a",
                req.getExperienceLevel() != null ? req.getExperienceLevel().name() : "auto",
                req.getBaseSalary()));

        return req;
    }

    private Location resolveLocationFromString(String locationStr) {
        if (locationStr == null || locationStr.isBlank()) return Location.BENGALURU;

        try {
            return Location.valueOf(locationStr.trim().toUpperCase().replace(" ", "_").replace("-", "_"));
        } catch (IllegalArgumentException ignored) {}

        String lower = locationStr.trim().toLowerCase();
        for (Location loc : Location.values()) {
            if (loc.getDisplayName().toLowerCase().contains(lower)
                    || lower.contains(loc.getDisplayName().toLowerCase())) {
                return loc;
            }
        }

        if (lower.contains("delhi") || lower.contains("ncr") || lower.contains("gurgaon") || lower.contains("noida"))
            return Location.DELHI_NCR;
        if (lower.contains("bangalore") || lower.contains("bengaluru") || lower.contains("blr"))
            return Location.BENGALURU;
        if (lower.contains("hyderabad") || lower.contains("hyd"))
            return Location.HYDERABAD;
        if (lower.contains("pune"))
            return Location.PUNE;

        return Location.BENGALURU;
    }

    // ── Housekeeping ───────────────────────────────────────────────────────────

    private void evictExpiredJobs() {
        long now = Instant.now().toEpochMilli();
        jobs.entrySet().removeIf(e -> (now - e.getValue().getCreatedAt()) > JOB_TTL_MILLIS);
    }
}
