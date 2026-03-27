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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * AiSalaryEnrichmentService
 *
 * Calls the Claude API (with web_search tool enabled) to fetch real salary data
 * for a given company, then inserts all entries into the PENDING review queue via
 * the existing SalaryService.submitSalary() path.
 *
 * Safeguards:
 *  - Max 20 entries per enrichment run
 *  - Rate limit: 1 enrichment per company per hour (in-memory, resets on restart)
 *  - All entries land as PENDING — nothing bypasses review
 *  - dataSource field logged to audit trail for AI-origin traceability
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiSalaryEnrichmentService {

    private static final int  MAX_ENTRIES       = 20;
    private static final long RATE_LIMIT_MILLIS = 60 * 60 * 1_000L; // 1 hour

    // in-memory rate-limit store: companyNameLower -> lastEnrichmentEpochMs
    private final ConcurrentHashMap<String, Long> lastEnrichmentTime = new ConcurrentHashMap<>();

    private final RestTemplate    restTemplate;
    private final ObjectMapper    objectMapper;
    private final SalaryService   salaryService;
    private final AuditLogService auditLogService;

    @Value("${anthropic.api.key}")
    private String anthropicApiKey;

    private static final String CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
    private static final String CLAUDE_MODEL   = "claude-sonnet-4-20250514";

    // ── Public entry point ─────────────────────────────────────────────────────

    /**
     * Enriches salary data for the given company name.
     *
     * @param companyName the company to enrich (e.g. "Google", "Flipkart")
     * @return number of salary entries successfully inserted as PENDING
     * @throws IllegalStateException if rate-limited
     */
    public int enrich(String companyName) {
        String key = companyName.trim().toLowerCase();

        // Rate limit check
        Long last = lastEnrichmentTime.get(key);
        if (last != null && (Instant.now().toEpochMilli() - last) < RATE_LIMIT_MILLIS) {
            long minutesLeft = (RATE_LIMIT_MILLIS - (Instant.now().toEpochMilli() - last)) / 60_000;
            throw new IllegalStateException(
                "Rate limit: already enriched \"" + companyName + "\" recently. "
                + "Try again in ~" + minutesLeft + " minute(s).");
        }

        log.info("[AI Enrich] Starting enrichment for company: {}", companyName);
        auditLogService.log("AiEnrichment", companyName, "ENRICH_STARTED",
            "AI salary enrichment initiated for: " + companyName);

        // Call Claude
        AiSalaryData aiData = callClaudeApi(companyName);
        if (aiData == null || aiData.getEntries() == null || aiData.getEntries().isEmpty()) {
            log.warn("[AI Enrich] No entries returned from Claude for: {}", companyName);
            return 0;
        }

        // Update rate-limit timestamp before inserting (prevents hammering on partial failure)
        lastEnrichmentTime.put(key, Instant.now().toEpochMilli());

        // Cap at MAX_ENTRIES
        List<AiSalaryEntry> entries = aiData.getEntries();
        if (entries.size() > MAX_ENTRIES) {
            log.info("[AI Enrich] Capping {} entries to {} for: {}", entries.size(), MAX_ENTRIES, companyName);
            entries = entries.subList(0, MAX_ENTRIES);
        }

        // Resolve the location reported at the top level of the AI response
        Location parentLocation = resolveLocationFromString(aiData.getLocation());

        // Map and submit each entry
        int inserted = 0;
        for (AiSalaryEntry aiEntry : entries) {
            try {
                SalaryRequest req = mapToSalaryRequest(aiEntry, companyName, aiData.getDataSource(), parentLocation);
                salaryService.submitSalary(req);
                inserted++;
            } catch (Exception e) {
                log.warn("[AI Enrich] Failed to insert entry '{}' for {}: {}",
                    aiEntry.getJobTitle(), companyName, e.getMessage());
            }
        }

        log.info("[AI Enrich] Inserted {}/{} entries for: {}", inserted, entries.size(), companyName);
        auditLogService.log("AiEnrichment", companyName, "ENRICH_COMPLETED",
            String.format("AI enrichment completed for %s — %d entries queued as PENDING. Source: %s",
                companyName, inserted, aiData.getDataSource()));

        return inserted;
    }

    // ── Claude API call ────────────────────────────────────────────────────────

    private AiSalaryData callClaudeApi(String companyName) {
        String prompt = buildPrompt(companyName);

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("model", CLAUDE_MODEL);
        requestBody.put("max_tokens", 4096);
        requestBody.put("tools", List.of(
            Map.of("type", "web_search_20250305", "name", "web_search")
        ));
        requestBody.put("messages", List.of(
            Map.of("role", "user", "content", prompt)
        ));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-api-key", anthropicApiKey);
        headers.set("anthropic-version", "2023-06-01");

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(CLAUDE_API_URL, request, Map.class);

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                log.error("[AI Enrich] Claude API returned non-2xx status: {}", response.getStatusCode());
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

            // Find the last text block — Claude emits tool_use + tool_result blocks
            // before its final JSON answer, so we scan from the end.
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

            // Strip markdown code fences if Claude wrapped the JSON
            jsonText = jsonText.trim();
            if (jsonText.startsWith("```")) {
                jsonText = jsonText.replaceAll("(?s)^```[a-z]*\\n?", "").replaceAll("(?s)```$", "").trim();
            }

            AiSalaryData data = objectMapper.readValue(jsonText, AiSalaryData.class);
            log.info("[AI Enrich] Parsed {} entries from Claude for: {}",
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

        // Map experienceLevel — SalaryService will auto-derive from YOE if null
        if (aiEntry.getExperienceLevel() != null) {
            try {
                req.setExperienceLevel(ExperienceLevel.valueOf(
                    aiEntry.getExperienceLevel().trim().toUpperCase()));
            } catch (IllegalArgumentException e) {
                log.debug("[AI Enrich] Unrecognised experienceLevel '{}' — letting service auto-derive",
                    aiEntry.getExperienceLevel());
            }
        }

        // Location comes from the top-level AiSalaryData field
        req.setLocation(parentLocation);

        // Salary (INR annual). Apply a floor of ₹1L as a basic sanity check.
        BigDecimal base = aiEntry.getBaseSalary();
        if (base == null || base.compareTo(BigDecimal.valueOf(100_000)) < 0) {
            base = BigDecimal.valueOf(500_000); // ₹5L fallback
            log.debug("[AI Enrich] baseSalary missing/too low for '{}', using fallback", aiEntry.getJobTitle());
        }
        req.setBaseSalary(base);
        req.setBonus(aiEntry.getBonus());
        req.setEquity(aiEntry.getEquity());

        // Employment type
        EmploymentType empType = EmploymentType.FULL_TIME;
        if (aiEntry.getEmploymentType() != null) {
            try {
                empType = EmploymentType.valueOf(aiEntry.getEmploymentType().trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                log.debug("[AI Enrich] Unrecognised employmentType '{}', defaulting to FULL_TIME",
                    aiEntry.getEmploymentType());
            }
        }
        req.setEmploymentType(empType);

        // Audit log entry — captures internalLevel + dataSource for AI-origin traceability
        String auditDetails = String.format(
            "[AI:%s] %s | internalLevel=%s | experienceLevel=%s | base=%.0f INR",
            dataSource != null ? dataSource : "ai_inference",
            req.getJobTitle(),
            aiEntry.getInternalLevel() != null ? aiEntry.getInternalLevel() : "n/a",
            req.getExperienceLevel() != null ? req.getExperienceLevel().name() : "auto",
            req.getBaseSalary()
        );
        auditLogService.log("SalaryEntry", companyName, "AI_ENTRY_MAPPED", auditDetails);

        return req;
    }

    /**
     * Resolves a free-text location string to a Location enum value.
     * Falls back to BENGALURU for anything unrecognised.
     */
    private Location resolveLocationFromString(String locationStr) {
        if (locationStr == null || locationStr.isBlank()) return Location.BENGALURU;

        // Try direct enum name match (e.g. "BENGALURU")
        try {
            return Location.valueOf(locationStr.trim().toUpperCase().replace(" ", "_").replace("-", "_"));
        } catch (IllegalArgumentException ignored) {}

        // Fuzzy match via display name
        String lower = locationStr.trim().toLowerCase();
        for (Location loc : Location.values()) {
            if (loc.getDisplayName().toLowerCase().contains(lower)
                    || lower.contains(loc.getDisplayName().toLowerCase())) {
                return loc;
            }
        }

        // Common aliases not covered by enum names
        if (lower.contains("delhi") || lower.contains("ncr") || lower.contains("gurgaon") || lower.contains("noida")) {
            return Location.DELHI_NCR;
        }
        if (lower.contains("bangalore") || lower.contains("bengaluru") || lower.contains("blr")) {
            return Location.BENGALURU;
        }
        if (lower.contains("hyderabad") || lower.contains("hyd")) {
            return Location.HYDERABAD;
        }
        if (lower.contains("pune")) {
            return Location.PUNE;
        }

        log.debug("[AI Enrich] Could not resolve location '{}', defaulting to BENGALURU", locationStr);
        return Location.BENGALURU;
    }
}
