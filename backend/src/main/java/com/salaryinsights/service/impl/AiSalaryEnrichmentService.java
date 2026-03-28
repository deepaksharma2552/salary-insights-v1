package com.salaryinsights.service.ai;

import com.salaryinsights.entity.FunctionLevel;
import com.salaryinsights.entity.User;
import com.salaryinsights.entity.JobFunction;
import com.salaryinsights.repository.AuditLogRepository;
import com.salaryinsights.repository.FunctionLevelRepository;
import com.salaryinsights.repository.UserRepository;
import com.salaryinsights.repository.JobFunctionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.salaryinsights.dto.request.SalaryRequest;
import com.salaryinsights.dto.response.AiSalaryData;
import com.salaryinsights.dto.response.AiSalaryData.AiSalaryEntry;
import com.salaryinsights.enums.EmploymentType;
import com.salaryinsights.enums.ExperienceLevel;
import com.salaryinsights.enums.Location;
import com.salaryinsights.service.impl.AuditLogService;
import com.salaryinsights.service.impl.SalaryService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.Sort;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.Set;
import java.util.concurrent.*;
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

    @Value("${ai.enrichment.max-entries:30}")
    private int maxEntries;

    @Value("${ai.enrichment.rate-limit-millis:3600000}")
    private long rateLimitMillis;

    @Value("${ai.enrichment.job-ttl-millis:1800000}")
    private long jobTtlMillis;

    @Value("${ai.enrichment.max-tokens:8000}")
    private int maxTokens;

    @Value("${ai.enrichment.max-search-uses:5}")
    private int maxSearchUses;

    @Value("${ai.enrichment.salary-change-threshold:0.10}")
    private double salaryChangeThresholdPct;

    @Value("${ai.enrichment.stale-entry-days:90}")
    private long staleEntryDays;

    // in-memory rate-limit store: companyNameLower -> lastEnrichmentEpochMs
    private final ConcurrentHashMap<String, Long> lastEnrichmentTime = new ConcurrentHashMap<>();

    // Async job store: jobId -> EnrichJob
    private final ConcurrentHashMap<String, EnrichJob> jobs = new ConcurrentHashMap<>();

    // Single-thread executor for background enrichment runs — bounded to 4 concurrent
    // jobs so an impatient admin can't spawn unlimited threads all blocking on Claude HTTP.
    // A 5th request will queue rather than spin up a new thread.
    private final ExecutorService enrichExecutor = new ThreadPoolExecutor(
        1, 4,
        60L, TimeUnit.SECONDS,
        new java.util.concurrent.LinkedBlockingQueue<>(20),
        r -> { Thread t = new Thread(r, "enrich-worker"); t.setDaemon(true); return t; },
        new ThreadPoolExecutor.CallerRunsPolicy()
    );

    // Scheduled eviction of stale jobs — runs every 5 minutes so the job map
    // doesn't grow unboundedly when admins trigger enrichment and close the tab
    // before polling completes (evictStaleJobs was previously only called inside
    // submitEnrichJob, meaning stale entries would never evict on a quiet server).
    private final java.util.concurrent.ScheduledExecutorService evictScheduler =
        java.util.concurrent.Executors.newSingleThreadScheduledExecutor(
            r -> { Thread t = new Thread(r, "enrich-evict"); t.setDaemon(true); return t; });

    @PostConstruct
    void startEvictionScheduler() {
        evictScheduler.scheduleAtFixedRate(this::evictStaleJobs, 5, 5, TimeUnit.MINUTES);
    }

    // ── EnrichJob ──────────────────────────────────────────────────────────────

    public enum JobStatus { RUNNING, DONE, FAILED }

    public static class EnrichJob {
        private final String    jobId;
        private final String    companyName;
        private volatile JobStatus status   = JobStatus.RUNNING;
        private volatile int       inserted = 0;
        private volatile String    error    = null;
        private final long          createdAt;

        public EnrichJob(String jobId, String companyName) {
            this.jobId       = jobId;
            this.companyName = companyName;
            this.createdAt   = Instant.now().toEpochMilli();
        }

        public String    getJobId()      { return jobId; }
        public String    getCompanyName(){ return companyName; }
        public JobStatus getStatus()     { return status; }
        public int       getInserted()   { return inserted; }
        public String    getError()      { return error; }
        public long      getCreatedAt()  { return createdAt; }

        void markDone(int inserted)  { this.inserted = inserted; this.status = JobStatus.DONE; }
        void markFailed(String err)  { this.error    = err;      this.status = JobStatus.FAILED; }
    }

    /**
     * Submits an async enrichment job and returns it immediately.
     * The actual Claude API call runs on a background thread.
     */
    public EnrichJob submitEnrichJob(String companyName) {
        String key = companyName.trim().toLowerCase();

        // Rate limit check
        Long last = lastEnrichmentTime.get(key);
        if (last != null && (Instant.now().toEpochMilli() - last) < rateLimitMillis) {
            long minutesLeft = (rateLimitMillis - (Instant.now().toEpochMilli() - last)) / 60_000;
            throw new IllegalStateException(
                "Rate limit: already enriched \"" + companyName + "\" recently. "
                + "Try again in ~" + minutesLeft + " minute(s).");
        }

        // Reserve the rate-limit slot immediately — before the async job runs — so a second
        // concurrent request cannot slip through the window between the check above and when
        // enrich() would have updated the map after the Claude call finishes.
        lastEnrichmentTime.put(key, Instant.now().toEpochMilli());

        // Create and register the job
        String    jobId = UUID.randomUUID().toString();
        EnrichJob job   = new EnrichJob(jobId, companyName.trim());
        jobs.put(jobId, job);

        // Evict stale jobs in background
        evictStaleJobs();

        // Run enrichment asynchronously
        enrichExecutor.submit(() -> {
            try {
                int inserted = enrich(companyName.trim());
                job.markDone(inserted);
            } catch (Exception e) {
                log.error("[AI Enrich] Async job {} failed: {}", jobId, e.getMessage(), e);
                job.markFailed(e.getMessage());
            }
        });

        return job;
    }

    /** Returns the job by ID, or null if not found / expired. */
    public EnrichJob getJob(String jobId) {
        return jobs.get(jobId);
    }

    private void evictStaleJobs() {
        long cutoff = Instant.now().toEpochMilli() - jobTtlMillis;
        jobs.entrySet().removeIf(e -> e.getValue().getCreatedAt() < cutoff);
    }

    private final RestTemplate             restTemplate;
    private final ObjectMapper             objectMapper;
    private final SalaryService            salaryService;
    private final AuditLogService          auditLogService;
    private final AuditLogRepository       auditLogRepository;
    private final JobFunctionRepository    jobFunctionRepository;
    private final FunctionLevelRepository  functionLevelRepository;
    private final UserRepository           userRepository;
    private final com.salaryinsights.repository.SalaryEntryRepository salaryEntryRepository;
    private final com.salaryinsights.repository.StandardizedLevelRepository standardizedLevelRepository;

    @Value("${anthropic.api.key}")
    private String anthropicApiKey;

    private static final String CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
    private static final String CLAUDE_MODEL   = "claude-sonnet-4-20250514";

    // ── Startup: warm rate-limit cache from DB ─────────────────────────────────

    /**
     * Runs once after the bean is fully constructed (all repositories injected).
     *
     * Reads the most recent ENRICH_COMPLETED audit log for every company that has
     * ever been enriched and pre-populates the in-memory lastEnrichmentTime map.
     *
     * Without this, a pod restart silently clears the rate limit for all companies,
     * allowing unlimited back-to-back enrichment calls until the map is rebuilt by
     * real traffic — burning Claude API budget with no guard.
     *
     * The warm-up is a single query returning only company names, then one
     * targeted query per company — typically a handful of rows total, fast at startup.
     */
    @PostConstruct
    void warmRateLimitCache() {
        try {
            List<String> companies = auditLogRepository.findAllEnrichedCompanyNames();
            if (companies.isEmpty()) return;

            PageRequest firstOnly = PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "createdAt"));
            int warmed = 0;

            for (String companyName : companies) {
                try {
                    Slice<LocalDateTime> result =
                        auditLogRepository.findLastEnrichCompletedAt(companyName, firstOnly);

                    if (result.hasContent()) {
                        LocalDateTime lastAt = result.getContent().get(0);
                        long epochMs = lastAt.toInstant(ZoneOffset.UTC).toEpochMilli();
                        lastEnrichmentTime.put(companyName.trim().toLowerCase(), epochMs);
                        warmed++;
                    }
                } catch (Exception e) {
                    log.warn("[AI Enrich] Could not warm rate-limit entry for '{}': {}", companyName, e.getMessage());
                }
            }

            log.info("[AI Enrich] Rate-limit cache warmed from DB: {} companies restored", warmed);
        } catch (Exception e) {
            // Non-fatal — service still starts. Worst case: one extra enrichment per company
            // until the map is populated by real traffic.
            log.warn("[AI Enrich] Rate-limit cache warm-up failed (non-fatal): {}", e.getMessage());
        }
    }

    // ── Public entry point ─────────────────────────────────────────────────────

    /**
     * Enriches salary data for the given company name.
     *
     * @param companyName the company to enrich (e.g. "Google", "Flipkart")
     * @return number of salary entries successfully inserted as PENDING
     * @throws IllegalStateException if rate-limited
     */
    private int enrich(String companyName) {
        // Note: rate-limit is now enforced (and the slot reserved) in submitEnrichJob()
        // before the async executor submits this method. The duplicate check that was
        // previously here has been removed to eliminate the race window between the two checks.

        log.info("[AI Enrich] Starting enrichment for company: {}", companyName);
        auditLogService.log("AiEnrichment", companyName, "ENRICH_STARTED",
            "AI salary enrichment initiated for: " + companyName);

        // Call Claude
        AiSalaryData aiData = callClaudeApi(companyName);
        if (aiData == null || aiData.getEntries() == null || aiData.getEntries().isEmpty()) {
            log.warn("[AI Enrich] No entries returned from Claude for: {}", companyName);
            return 0;
        }

        // Cap at maxEntries
        List<AiSalaryEntry> entries = aiData.getEntries();
        if (entries.size() > maxEntries) {
            log.info("[AI Enrich] Capping {} entries to {} for: {}", entries.size(), maxEntries, companyName);
            entries = entries.subList(0, maxEntries);
        }

        // Resolve location per-entry from aiEntry.getLocation() — see mapToSalaryRequest()
        // The old top-level aiData.getLocation() is deprecated and no longer used here.

        // Fetch an admin user to act as submitter — background threads have no security context
        User systemUser = userRepository.findFirstByRole(com.salaryinsights.enums.Role.ADMIN)
                .orElseThrow(() -> new RuntimeException("No admin user found for AI enrichment"));

        // Load job functions once for the whole batch — resolveJobFunction() previously
        // called findAllWithLevels() inside the per-entry loop (up to 20 identical DB hits).
        List<JobFunction> allJobFunctions = jobFunctionRepository.findAllWithLevels();

        // Map and submit each entry via upsert-by-fingerprint
        int inserted = 0;
        int skipped  = 0;
        int rejected = 0;
        for (AiSalaryEntry aiEntry : entries) {
            try {
                SalaryRequest req = mapToSalaryRequest(aiEntry, companyName, aiData.getDataSource(), allJobFunctions);
                if (req == null) {
                    // null means the entry was rejected (e.g. non-INR currency) — already logged
                    rejected++;
                    continue;
                }
                UpsertResult result = upsertAiEntry(req, systemUser);
                switch (result) {
                    case INSERTED -> inserted++;
                    case SKIPPED  -> skipped++;
                }
            } catch (Exception e) {
                log.warn("[AI Enrich] Failed to upsert entry '{}' for {}: {}",
                    aiEntry.getJobTitle(), companyName, e.getMessage());
            }
        }

        log.info("[AI Enrich] Complete for {}: {} inserted, {} skipped, {} rejected (wrong currency)",
            companyName, inserted, skipped, rejected);
        auditLogService.log("AiEnrichment", companyName, "ENRICH_COMPLETED",
            String.format("AI enrichment for %s — %d inserted, %d skipped, %d rejected (currency). Source: %s",
                companyName, inserted, skipped, rejected, aiData.getDataSource()));

        return inserted;
    }

    // ── Claude API call ────────────────────────────────────────────────────────

    private AiSalaryData callClaudeApi(String companyName) {
        String userPrompt = buildPrompt(companyName);
        String systemPrompt = "You are a salary data researcher for an Indian salary transparency platform. " +
            "Return ONLY valid JSON in the exact shape specified. " +
            "Never include prose, markdown code fences, or any explanation before or after the JSON object.";

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("model", CLAUDE_MODEL);
        requestBody.put("max_tokens", maxTokens);
        requestBody.put("system", systemPrompt);
        requestBody.put("tools", List.of(
            Map.of("type", "web_search_20250305", "name", "web_search", "max_uses", maxSearchUses)
        ));
        requestBody.put("messages", List.of(
            Map.of("role", "user", "content", userPrompt)
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

            // Detect token-limit truncation early — if stop_reason is "max_tokens" the JSON
            // is guaranteed to be cut off mid-structure, which will always fail to parse.
            // Fail fast with a clear log rather than letting Jackson throw a confusing error.
            String stopReason = (String) body.get("stop_reason");
            if ("max_tokens".equals(stopReason)) {
                log.error("[AI Enrich] Claude hit max_tokens limit for '{}' — response truncated, JSON will be invalid. " +
                    "Increase max_tokens in callClaudeApi().", companyName);
                return null;
            }

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

            jsonText = jsonText.trim();

            // Strip markdown code fences if Claude wrapped the JSON
            if (jsonText.startsWith("```")) {
                jsonText = jsonText.replaceAll("(?s)^```[a-z]*\\n?", "").replaceAll("(?s)```$", "").trim();
            }

            // Claude sometimes prefixes the JSON with a prose preamble (e.g. "Based on my
            // searches...") before the actual JSON object, even when instructed not to.
            // Extract the JSON object by finding the first '{' and the matching last '}'.
            // This is safe because our expected schema is always a single top-level object.
            int jsonStart = jsonText.indexOf('{');
            int jsonEnd   = jsonText.lastIndexOf('}');
            if (jsonStart > 0 && jsonEnd > jsonStart) {
                log.warn("[AI Enrich] Claude prefixed JSON with {} chars of prose for '{}' — extracting JSON and continuing",
                    jsonStart, companyName);
                jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
            } else if (jsonStart < 0) {
                log.error("[AI Enrich] No JSON object found in Claude response for: {}", companyName);
                return null;
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
        int stopSearchAt = Math.max(10, maxEntries - 5); // stop searching once enough data points found
        return """
            IMPORTANT: Your response must begin immediately with the character '{'. Do NOT write any text, commentary, or explanation before the JSON object.

            Your goal is to return REAL, VERIFIED salary data for "%s" employees in India.

            SEARCH STRATEGY — follow this order, stop as soon as you have enough data:
            1. Search levels.fyi for "%s India" first — most reliable source for total comp breakdown.
            2. Only search glassdoor.co.in if levels.fyi returned fewer than 10 entries.
            3. Only search ambitionbox.com if you still need more data after steps 1 and 2.
            Do NOT search linkedin, naukri, payscale, iimjobs unless the above 3 sources are all exhausted.
            STOP SEARCHING as soon as you have %d or more real data points — do not search all sources unnecessarily.

            TARGET — return UP TO %d entries. Stop at whatever real data you have found — do NOT fabricate
            or estimate salaries to pad to %d. Fewer real entries are always better than fabricated ones.
            """.formatted(companyName, companyName, stopSearchAt, maxEntries, maxEntries)
            + """
            DIVERSITY RULES — no two entries may share the same (jobTitle + experienceLevel + location):
            - Cover ALL seniority bands: INTERN, ENTRY, MID, SENIOR, LEAD, MANAGER, DIRECTOR
            - Cover at least 3 departments: Engineering, Product, Design, Data
            - Cover at least 3 cities: Bengaluru, Hyderabad, Delhi NCR — each entry must record its own city

            Return ONLY valid JSON — no prose, no markdown code fences, no explanation before or after.
            The JSON must exactly match this shape:

            {
              "companyName": "%s",
              "entries": [
                {
                  "jobTitle": "<e.g. Software Engineer>",
                  "department": "<e.g. Engineering, Data Science, Product>",
                  "location": "<MUST be the actual city for this specific entry: Bengaluru, Hyderabad, Delhi NCR, Mumbai, Pune, Chennai, or other Indian city>",
                  "dataSource": "<the specific source this entry came from: levels.fyi, glassdoor, or ambitionbox>",
                  "internalLevel": "<company-specific level e.g. L4, SDE-II, IC3, or null if unknown>",
                  "experienceLevel": "<MUST be exactly one of: INTERN, ENTRY, MID, SENIOR, LEAD, MANAGER, DIRECTOR, VP, C_LEVEL>",
                  "yearsOfExperience": <typical years of experience as integer, e.g. 1 for ENTRY, 3 for MID, 6 for SENIOR, 9 for LEAD>,
                  "employmentType": "<MUST be exactly one of: FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, FREELANCE>",
                  "baseSalary": <annual base salary in INR as integer, e.g. 2500000>,
                  "bonus": <annual bonus in INR as integer, or null>,
                  "equity": <annual equity/ESOP value in INR as integer, or null>,
                  "currency": "INR",
                  "notes": "<brief context e.g. median for 3-5 yoe in Bengaluru, source: levels.fyi>"
                }
              ]
            }

            Critical rules:
            - ALL salary values MUST be in INR (Indian Rupees), annual amounts
            - location MUST be the actual city for that specific data point — do not default every entry to one city
            - dataSource MUST be the specific site this data point came from (levels.fyi, glassdoor, or ambitionbox)
            - experienceLevel MUST be exactly one of the listed enum values — no other values
            - employmentType MUST be exactly one of the listed enum values — no other values
            - baseSalary must be a positive integer, never null or zero
            - Do NOT include any text, explanation, or markdown outside the JSON object
            - Do NOT repeat a (jobTitle + experienceLevel + location) combination across entries
            """.formatted(companyName);
    }

    // ── Vesting schedule ───────────────────────────────────────────────────────

    /**
     * Standard equity vesting periods (years) for well-known companies.
     * Claude typically returns the *total grant value* sourced from levels.fyi /
     * Glassdoor, so we divide by the vesting period to get the annual equivalent.
     * Any company not listed here defaults to 4 years (the industry standard).
     */
    private static final Map<String, Integer> VESTING_YEARS;
    static {
        Map<String, Integer> m = new HashMap<>();
        // 4-year vesting (most common)
        m.put("google",        4); m.put("alphabet",      4);
        m.put("meta",          4); m.put("facebook",      4);
        m.put("microsoft",     4); m.put("amazon",        4);
        m.put("apple",         4); m.put("netflix",       4);
        m.put("uber",          4); m.put("airbnb",        4);
        m.put("linkedin",      4); m.put("twitter",       4); m.put("x",            4);
        m.put("salesforce",    4); m.put("adobe",         4);
        m.put("intel",         4); m.put("qualcomm",      4);
        m.put("oracle",        4); m.put("ibm",           4);
        m.put("cisco",         4); m.put("nvidia",        4);
        m.put("stripe",        4); m.put("databricks",    4);
        m.put("flipkart",      4); m.put("meesho",        4);
        m.put("swiggy",        4); m.put("zomato",        4);
        m.put("phonepe",       4); m.put("paytm",         4);
        m.put("razorpay",      4); m.put("cred",          4);
        m.put("groww",         4); m.put("zepto",         4);
        m.put("blinkit",       4); m.put("dunzo",         4);
        m.put("byju",         4);  m.put("unacademy",     4);
        m.put("freshworks",    4); m.put("zoho",          4);
        m.put("infosys",       4); m.put("wipro",         4);
        m.put("tcs",           4); m.put("hcl",           4);
        m.put("tech mahindra", 4); m.put("mphasis",       4);
        // 3-year vesting
        m.put("walmart",       3); m.put("myntra",        3);
        // 2-year vesting
        m.put("goldman sachs", 2); m.put("jpmorgan",      2);
        m.put("morgan stanley",2); m.put("deloitte",      2);
        VESTING_YEARS = Collections.unmodifiableMap(m);
    }

    private static final int DEFAULT_VESTING_YEARS = 4;

    /**
     * Returns the vesting period for a company by doing a case-insensitive
     * substring match against the known schedule map.
     */
    private int vestingYearsFor(String companyName) {
        if (companyName == null) return DEFAULT_VESTING_YEARS;
        String lower = companyName.trim().toLowerCase();
        for (Map.Entry<String, Integer> entry : VESTING_YEARS.entrySet()) {
            if (lower.contains(entry.getKey())) return entry.getValue();
        }
        return DEFAULT_VESTING_YEARS;
    }

    // ── Dedup thresholds — injected from ai.enrichment.* properties ───────────
    // (salary-change-threshold and stale-entry-days are declared as @Value fields above)

    // ── Upsert by fingerprint ──────────────────────────────────────────────────

    private enum UpsertResult { INSERTED, SKIPPED }

    /**
     * Decides whether to insert a fresh PENDING entry or skip an AI-enriched salary.
     *
     * Rules (applied against the MOST RECENT existing entry sharing the fingerprint):
     *
     *  1. No existing entry at all           → INSERT  (brand-new role/level combination)
     *  2. Base salary changed > 10 %         → INSERT  (meaningfully different observation)
     *  3. Existing entry older than 90 days  → INSERT  (data aged out, refresh it)
     *  4. Everything else                    → SKIP    (stale repeat, nothing new)
     *
     * Each inserted entry is independent — existing APPROVED entries are never touched.
     * The fingerprint is stored on the new entry so future runs can look it up.
     *
     * Fingerprint = SHA-256(companyName | jobTitle | experienceLevel | location | employmentType)
     */
    @org.springframework.transaction.annotation.Transactional
    private UpsertResult upsertAiEntry(SalaryRequest req, User systemUser) {
        String companyKey = req.getCompanyName() != null
            ? req.getCompanyName().trim().toLowerCase()
            : "unknown";

        String fingerprint = computeFingerprint(
            companyKey,
            req.getJobTitle(),
            req.getExperienceLevel(),
            req.getLocation(),
            req.getEmploymentType()
        );

        // Store fingerprint on the request so submitSalary() persists it on the new entity
        req.setAiFingerprint(fingerprint);

        // Find the most recent existing entry for this fingerprint (any review status)
        java.util.Optional<com.salaryinsights.entity.SalaryEntry> mostRecent =
            salaryEntryRepository.findTopByAiFingerprintOrderByCreatedAtDesc(fingerprint);

        // Rule 1 — no prior entry for this role/level/location combination
        if (mostRecent.isEmpty()) {
            salaryService.submitSalary(req, systemUser);
            log.debug("[AI Enrich] INSERTED (new combination): {} fingerprint={}", req.getJobTitle(), fingerprint);
            return UpsertResult.INSERTED;
        }

        com.salaryinsights.entity.SalaryEntry latest = mostRecent.get();

        // Rule 2 — base salary has shifted by more than the threshold → new real-world observation
        BigDecimal existingBase = latest.getBaseSalary();
        BigDecimal incomingBase = req.getBaseSalary();
        if (existingBase != null && incomingBase != null
                && existingBase.compareTo(BigDecimal.ZERO) > 0) {

            double changePct = incomingBase.subtract(existingBase)
                                           .abs()
                                           .divide(existingBase, 4, RoundingMode.HALF_UP)
                                           .doubleValue();

            if (changePct > salaryChangeThresholdPct) {
                salaryService.submitSalary(req, systemUser);
                log.info("[AI Enrich] INSERTED (salary moved {:.1f}%): {} — was ₹{} now ₹{}",
                    changePct * 100, req.getJobTitle(),
                    existingBase.toPlainString(), incomingBase.toPlainString());
                auditLogService.log("SalaryEntry", fingerprint, "AI_SALARY_SHIFT",
                    String.format("[AI] %s at %s: base ₹%s → ₹%s (%.1f%% change)",
                        req.getJobTitle(), req.getCompanyName(),
                        existingBase.toPlainString(), incomingBase.toPlainString(),
                        changePct * 100));
                return UpsertResult.INSERTED;
            }
        }

        // Rule 3 — existing entry has aged out past the staleness threshold
        if (latest.getCreatedAt() != null) {
            long daysSinceCreated = java.time.temporal.ChronoUnit.DAYS.between(
                latest.getCreatedAt(), java.time.LocalDateTime.now());

            if (daysSinceCreated >= staleEntryDays) {
                salaryService.submitSalary(req, systemUser);
                log.info("[AI Enrich] INSERTED (data aged {}d > {}d): {}",
                    daysSinceCreated, staleEntryDays, req.getJobTitle());
                auditLogService.log("SalaryEntry", fingerprint, "AI_STALE_REFRESH",
                    String.format("[AI] %s at %s: previous entry was %d days old — refreshed",
                        req.getJobTitle(), req.getCompanyName(), daysSinceCreated));
                return UpsertResult.INSERTED;
            }
        }

        // Rule 4 — salary is within threshold and entry is recent → stale repeat, skip
        log.debug("[AI Enrich] SKIPPED (no meaningful change, entry is recent): {} fingerprint={}",
            req.getJobTitle(), fingerprint);
        return UpsertResult.SKIPPED;
    }

    /**
     * Computes a stable SHA-256 fingerprint for a salary entry combination.
     * All inputs are normalised (lowercased, trimmed) before hashing so that
     * "Software Engineer" and "software engineer" produce the same key.
     */
    private String computeFingerprint(String companyKey,
                                       String jobTitle,
                                       com.salaryinsights.enums.ExperienceLevel experienceLevel,
                                       com.salaryinsights.enums.Location location,
                                       com.salaryinsights.enums.EmploymentType employmentType) {
        String raw = String.join("|",
            companyKey   != null ? companyKey.trim().toLowerCase()           : "unknown",
            jobTitle     != null ? jobTitle.trim().toLowerCase()             : "unknown",
            experienceLevel  != null ? experienceLevel.name().toLowerCase()  : "unknown",
            location         != null ? location.name().toLowerCase()         : "unknown",
            employmentType   != null ? employmentType.name().toLowerCase()   : "unknown"
        );
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(64);
            for (byte b : hash) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 is guaranteed present in all JVMs — this never throws
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    // ── Mapping ────────────────────────────────────────────────────────────────

    private SalaryRequest mapToSalaryRequest(AiSalaryEntry aiEntry,
                                              String companyName,
                                              String dataSource,
                                              List<JobFunction> allJobFunctions) {
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

        // Resolve location from the per-entry field — each entry now carries its own city
        // so multi-city batches (Bengaluru + Hyderabad + Delhi NCR) are stored correctly.
        // Falls back to BENGALURU if the entry omits the field.
        req.setLocation(resolveLocationFromString(aiEntry.getLocation()));

        // ── Currency guard ─────────────────────────────────────────────────────
        // The prompt instructs Claude to return INR, but levels.fyi often surfaces USD
        // values for multinationals. An undetected USD figure would be ~83× too large
        // (e.g. $120,000 stored as ₹1,20,00,000 — ₹1.2 Cr instead of ₹1L base).
        // We reject any entry whose currency field is not INR rather than silently
        // persisting wildly wrong data.
        String currency = aiEntry.getCurrency();
        if (currency != null && !currency.isBlank() && !"INR".equalsIgnoreCase(currency.trim())) {
            log.warn("[AI Enrich] SKIPPING entry '{}' at {} — currency is '{}', expected INR. " +
                     "Raw baseSalary={} would be ~{}x too large if stored as INR.",
                aiEntry.getJobTitle(), companyName, currency,
                aiEntry.getBaseSalary(),
                "USD".equalsIgnoreCase(currency.trim()) ? "83" : "unknown");
            return null; // caller checks for null and skips the entry
        }

        // ── Salary sanity bounds ───────────────────────────────────────────────
        // Floor: ₹1L minimum — anything below is clearly wrong data.
        // Ceiling: ₹5Cr baseSalary — above this the figure is almost certainly a USD
        // amount that Claude labelled as INR without actually converting it. Even the
        // highest-paid engineering leaders at Indian unicorns don't draw ₹5Cr base.
        // USD values at this scale (e.g. $600K base) would come in as 60_000_000 INR
        // which is 12× the ceiling — easy to catch.
        // We reject rather than clamp: clamping would silently corrupt the data.
        BigDecimal base = aiEntry.getBaseSalary();
        if (base == null || base.compareTo(BigDecimal.valueOf(100_000)) < 0) {
            base = BigDecimal.valueOf(500_000); // ₹5L fallback for missing/implausibly low
            log.debug("[AI Enrich] baseSalary missing/too low for '{}', using ₹5L fallback", aiEntry.getJobTitle());
        }
        final BigDecimal BASE_SALARY_CEILING = BigDecimal.valueOf(5_00_00_000L); // ₹5 Cr
        if (base.compareTo(BASE_SALARY_CEILING) > 0) {
            log.warn("[AI Enrich] SKIPPING entry '{}' at {} — baseSalary={} exceeds ₹5Cr ceiling. " +
                     "Likely a USD figure (~${}) that Claude did not convert to INR.",
                aiEntry.getJobTitle(), companyName, base.toPlainString(),
                base.divide(BigDecimal.valueOf(83), 0, RoundingMode.HALF_UP).toPlainString());
            return null;
        }
        req.setBaseSalary(base);

        // Bonus ceiling: ₹2Cr — bonuses above this are implausible for Indian market
        BigDecimal bonus = aiEntry.getBonus();
        if (bonus != null && bonus.compareTo(BigDecimal.valueOf(2_00_00_000L)) > 0) {
            log.warn("[AI Enrich] Nulling bonus for '{}' at {} — bonus={} exceeds ₹2Cr ceiling, likely USD",
                aiEntry.getJobTitle(), companyName, bonus.toPlainString());
            bonus = null;
        }
        req.setBonus(bonus);

        // Normalise equity: Claude returns total grant value (as sourced from levels.fyi /
        // Glassdoor), so we divide by the company's standard vesting period to get the
        // annual equivalent before storing.
        // Ceiling: ₹20Cr total grant — above this is almost certainly a USD figure
        // (e.g. $2M RSU grant at FAANG = ₹16.6Cr which is right at the boundary).
        // vestingYears is computed once here and reused in the audit log below.
        int vestingYears = vestingYearsFor(companyName);
        BigDecimal annualEquity = null;
        BigDecimal rawEquity = aiEntry.getEquity();
        if (rawEquity != null) {
            final BigDecimal EQUITY_GRANT_CEILING = BigDecimal.valueOf(20_00_00_000L); // ₹20 Cr
            if (rawEquity.compareTo(EQUITY_GRANT_CEILING) > 0) {
                log.warn("[AI Enrich] Nulling equity for '{}' at {} — total grant={} exceeds ₹20Cr ceiling, likely USD (~${})",
                    aiEntry.getJobTitle(), companyName, rawEquity.toPlainString(),
                    rawEquity.divide(BigDecimal.valueOf(83), 0, RoundingMode.HALF_UP).toPlainString());
                rawEquity = null;
            }
        }
        if (rawEquity != null) {
            annualEquity = rawEquity.divide(BigDecimal.valueOf(vestingYears), 0, RoundingMode.HALF_UP);
            log.debug("[AI Enrich] Equity for '{}' at {}: total={} / {}yr vesting = {} annual",
                aiEntry.getJobTitle(), companyName,
                rawEquity.toPlainString(), vestingYears, annualEquity.toPlainString());
        }
        req.setEquity(annualEquity);

        // Use YOE from AI response if provided, otherwise derive midpoint from experienceLevel
        // so the drawer never shows '—' for AI entries
        if (aiEntry.getYearsOfExperience() != null && aiEntry.getYearsOfExperience() >= 0) {
            req.setYearsOfExperience(aiEntry.getYearsOfExperience());
        } else if (req.getExperienceLevel() != null) {
            req.setYearsOfExperience(deriveYoeFromLevel(req.getExperienceLevel()));
        }

        // Set data source — prefer per-entry dataSource (new schema), fall back to batch-level
        // dataSource (old schema, kept for backwards compatibility), then "AI" as last resort.
        String entrySource = aiEntry.getDataSource();
        String batchSource = dataSource;
        String source;
        if (entrySource != null && !entrySource.isBlank()) {
            source = entrySource.trim();
        } else if (batchSource != null && !batchSource.isBlank()) {
            source = batchSource;
        } else {
            source = "AI";
        }
        req.setDataSource(source);

        // Preserve the raw total grant so admin UI can display both values
        if (rawEquity != null) {
            req.setEquityTotalGrant(rawEquity);
        }

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

        // Resolve job function using keyword matching
        JobFunction resolvedFn = null;
        try {
            resolvedFn = resolveJobFunction(aiEntry.getDepartment(), aiEntry.getJobTitle(), allJobFunctions);
            if (resolvedFn != null) {
                req.setJobFunctionId(resolvedFn.getId());
                FunctionLevel fl = resolveFunctionLevel(resolvedFn, aiEntry.getJobTitle(), req.getExperienceLevel());
                if (fl != null) {
                    req.setFunctionLevelId(fl.getId());
                    log.debug("[AI Enrich] Resolved '{}' → function='{}' level='{}'",
                        aiEntry.getJobTitle(), resolvedFn.getDisplayName(), fl.getName());
                } else {
                    log.debug("[AI Enrich] Function '{}' found but no level match for '{}'",
                        resolvedFn.getDisplayName(), aiEntry.getJobTitle());
                }
            }
        } catch (Exception e) {
            log.warn("[AI Enrich] Function/level resolution failed for '{}': {}",
                aiEntry.getJobTitle(), e.getMessage());
        }

        // Map YOE → standardized level.
        //
        // PRIMARY PATH (DB-driven): if the resolved job function has levels with YOE bands
        // configured by the admin, find the matching band and use its linked standardized level.
        // This makes the mapping fully controllable from the Admin UI with no code deploys.
        //
        // FALLBACK (hardcoded): if no YOE bands are configured for this function (e.g. a newly
        // added function, or a function whose admin has not set bands yet), fall back to the
        // Engineering IC ladder in yoeToStandardizedLevelName().
        try {
            boolean resolvedViaDb = false;

            if (resolvedFn != null && req.getYearsOfExperience() != null) {
                List<FunctionLevel> bandsConfigured = resolvedFn.getLevels().stream()
                    .filter(fl -> fl.getMinYoe() != null && fl.getMaxYoe() != null
                                  && fl.getStandardizedLevel() != null)
                    .sorted(Comparator.comparingInt(FunctionLevel::getMinYoe))
                    .toList();

                if (!bandsConfigured.isEmpty()) {
                    int yoe = req.getYearsOfExperience();
                    FunctionLevel matched = bandsConfigured.stream()
                        .filter(fl -> yoe >= fl.getMinYoe() && yoe < fl.getMaxYoe())
                        .findFirst()
                        .orElse(bandsConfigured.get(bandsConfigured.size() - 1));

                    req.setStandardizedLevelId(matched.getStandardizedLevel().getId());
                    resolvedViaDb = true;
                    log.debug("[AI Enrich] DB-band mapped '{}' ({}y) → '{}' via function '{}'",
                        req.getJobTitle(), yoe,
                        matched.getStandardizedLevel().getName(), resolvedFn.getDisplayName());
                }
            }

            if (!resolvedViaDb) {
                // Do NOT fall back to the hardcoded yoeToStandardizedLevelName() ladder.
                // That method returns SDE-tier names ("SDE 1", "SDE 2" …) which belong to
                // one naming convention, while function levels set up by admins for
                // non-Engineering functions (e.g. "Junior", "Senior") belong to another.
                // Mixing both causes duplicate level rows in analytics charts.
                //
                // Instead: leave standardizedLevelId unset and log a warning so the admin
                // knows to configure YOE bands for this job function.
                String jobFn = resolvedFn != null ? resolvedFn.getDisplayName() : "unknown";
                log.warn("[AI Enrich] No YOE bands configured for job function '{}' — " +
                         "standardized level NOT set for entry '{}' ({}y, {}). " +
                         "Configure YOE bands in Admin → Job Functions to fix this.",
                    jobFn, req.getJobTitle(), req.getYearsOfExperience(), req.getExperienceLevel());
            }
        } catch (Exception e) {
            log.warn("[AI Enrich] Standardized level mapping failed for '{}': {}",
                aiEntry.getJobTitle(), e.getMessage());
        }

        // Audit log — use the resolved per-entry source (not the raw batch-level dataSource param)
        // so logs accurately reflect which site this specific entry came from.
        String auditDetails = String.format(
            "[AI:%s] %s | internalLevel=%s | experienceLevel=%s | base=%.0f INR | equity=%s (/%dyr vesting)",
            source,
            req.getJobTitle(),
            aiEntry.getInternalLevel() != null ? aiEntry.getInternalLevel() : "n/a",
            req.getExperienceLevel() != null ? req.getExperienceLevel().name() : "auto",
            req.getBaseSalary(),
            annualEquity != null ? annualEquity.toPlainString() : "null",
            rawEquity != null ? vestingYears : 0
        );
        auditLogService.log("SalaryEntry", companyName, "AI_ENTRY_MAPPED", auditDetails);

        return req;
    }

    /**
     * Resolves a free-text location string to a Location enum value.
     * Returns null for unrecognised values so the admin can set the correct location
     * during review, rather than silently misfiling entries under BENGALURU.
     */
    private Location resolveLocationFromString(String locationStr) {
        if (locationStr == null || locationStr.isBlank()) return null;

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

        // Unknown location — return null so the admin can correct it during review
        // rather than silently misfiling it under BENGALURU and skewing that city's data.
        log.info("[AI Enrich] Could not resolve location '{}', leaving blank for admin review", locationStr);
        return null;
    }

    // ── Job function / level resolution ────────────────────────────────────────

    /**
     * Department → function keyword map.
     * Keys are lowercased substrings to match against the AI-returned department + job title string.
     * Values are the canonical job_functions.name values in the DB.
     *
     * IMPORTANT: Uses a LinkedHashMap with explicit insertion order so that more-specific
     * keywords are checked before broader ones. For example, "data analyst" must match
     * "analyst" → ANALYTICS before "data" → ENGINEERING, so "analyst" is inserted first.
     * Likewise "product manager" must match before "product" alone.
     *
     * The old Map.ofEntries() had no guaranteed iteration order, causing e.g. "Data Analyst"
     * to resolve to ENGINEERING (via "data") instead of ANALYTICS (via "analyst").
     */
    private static final Map<String, String> DEPT_TO_FUNCTION;
    static {
        Map<String, String> m = new LinkedHashMap<>();
        // More-specific patterns first
        m.put("product manager", "PRODUCT");
        m.put("product management", "PRODUCT");
        m.put("program manager",  "PROGRAM");   // must be before "manager" and "engineer"
        m.put("technical program","PROGRAM");   // "Technical Program Manager" before "engineer"
        m.put("data scientist",  "ANALYTICS");
        m.put("data analyst",    "ANALYTICS");
        m.put("business analyst","ANALYTICS");
        m.put("analytics",       "ANALYTICS");
        m.put("analyst",         "ANALYTICS");
        m.put("devops",          "ENGINEERING");
        m.put("sre",             "ENGINEERING");
        m.put("fullstack",       "ENGINEERING");
        m.put("full stack",      "ENGINEERING");
        m.put("frontend",        "ENGINEERING");
        m.put("front-end",       "ENGINEERING");
        m.put("backend",         "ENGINEERING");
        m.put("back-end",        "ENGINEERING");
        m.put("machine learning","ENGINEERING");
        m.put("software",        "ENGINEERING");
        m.put("engineer",        "ENGINEERING");
        m.put("ml",              "ENGINEERING");
        m.put("ai",              "ENGINEERING");
        m.put("data",            "ENGINEERING");  // generic "Data Engineering" — after analyst/scientist
        m.put("product",         "PRODUCT");      // generic "Product" — after "product manager"
        m.put("program",         "PROGRAM");
        m.put("design",          "DESIGN");
        m.put("ux",              "DESIGN");
        m.put("ui",              "DESIGN");
        m.put("research",        "DESIGN");
        m.put("finance",         "FINANCE");
        m.put("legal",           "LEGAL");
        m.put("recruit",         "HR");
        m.put("people",          "HR");
        m.put("hr",              "HR");
        m.put("sales",           "SALES");
        m.put("growth",          "MARKETING");
        m.put("content",         "MARKETING");
        m.put("marketing",       "MARKETING");
        m.put("operation",       "OPERATIONS");
        m.put("ops",             "OPERATIONS");
        m.put("customer",        "SUPPORT");
        m.put("support",         "SUPPORT");
        DEPT_TO_FUNCTION = Collections.unmodifiableMap(m);
    }

    /**
     * Resolves a department string to a JobFunction from the DB using fuzzy keyword matching.
     * Returns null if no match — entry still saves, just without a function mapping.
     */
    private JobFunction resolveJobFunction(String department, String jobTitle, List<JobFunction> allFunctions) {
        if (allFunctions.isEmpty()) return null;

        // Build a search string from both department and job title
        String search = ((department != null ? department : "") + " " +
                         (jobTitle   != null ? jobTitle   : "")).toLowerCase();

        // Find the best-matching function name via keyword lookup
        String targetFunctionName = null;
        for (Map.Entry<String, String> entry : DEPT_TO_FUNCTION.entrySet()) {
            if (search.contains(entry.getKey())) {
                targetFunctionName = entry.getValue();
                break;
            }
        }

        if (targetFunctionName == null) {
            log.debug("[AI Enrich] No function match for dept='{}' title='{}'", department, jobTitle);
            return null;
        }

        final String fnName = targetFunctionName;
        return allFunctions.stream()
            .filter(f -> f.getName().equalsIgnoreCase(fnName))
            .findFirst()
            .orElseGet(() -> {
                log.debug("[AI Enrich] Function '{}' matched keyword but not found in DB — skipping", fnName);
                return null;
            });
    }

    /**
     * Resolves the best-fit FunctionLevel within a JobFunction for a given job title
     * and experience level. Uses a scoring approach: prefers levels whose name contains
     * keywords from the job title, with a secondary sort by experience level proximity.
     *
     * Returns null if no reasonable match is found.
     */
    private FunctionLevel resolveFunctionLevel(JobFunction function, String jobTitle,
                                                ExperienceLevel experienceLevel) {
        List<FunctionLevel> levels = function.getLevels();
        if (levels == null || levels.isEmpty()) return null;

        String titleLower = jobTitle != null ? jobTitle.toLowerCase() : "";

        // Score each level: +2 for title keyword match, +1 for seniority keyword match
        record Scored(FunctionLevel level, int score) {}

        List<Scored> scored = levels.stream().map(fl -> {
            String lvlLower = fl.getName().toLowerCase();
            int score = 0;

            // Title keyword match (e.g. "Product Designer" → prefers level named "Designer").
            // Skip generic role nouns that are already captured by seniority keywords — matching
            // "engineer" in "Software Engineer" against a level named "Staff Engineer" would
            // score +2 for every experience level, drowning out the seniority signal and causing
            // all Software Engineer entries to resolve to Staff Engineer regardless of level.
            Set<String> GENERIC_ROLE_WORDS = Set.of(
                "engineer", "manager", "designer", "analyst", "scientist",
                "developer", "architect", "lead", "director", "associate",
                "specialist", "consultant", "intern", "executive"
            );
            String[] titleWords = titleLower.split("\\s+");
            for (String word : titleWords) {
                if (word.length() > 3 && !GENERIC_ROLE_WORDS.contains(word) && lvlLower.contains(word)) score += 2;
            }

            // Seniority match — map ExperienceLevel to seniority keywords
            if (experienceLevel != null) {
                List<String> seniorityKeywords = switch (experienceLevel) {
                    case INTERN   -> List.of("intern", "trainee");
                    case ENTRY    -> List.of("junior", "associate", "1", "i");
                    case MID      -> List.of("mid", "2", "ii");
                    case SENIOR   -> List.of("senior", "sr.", "sr ", "3", "iii", "staff");
                    case LEAD     -> List.of("lead", "principal", "staff");
                    case MANAGER  -> List.of("manager", "mgr");
                    case DIRECTOR -> List.of("director");
                    case VP       -> List.of("vp", "vice president");
                    case C_LEVEL  -> List.of("chief", "cto", "cpo", "ceo");
                };
                for (String kw : seniorityKeywords) {
                    if (lvlLower.contains(kw)) { score += 1; break; }
                }
            }

            return new Scored(fl, score);
        }).toList();

        // Pick the highest-scoring level; minimum score of 1 to avoid wild guesses
        return scored.stream()
            .filter(s -> s.score() > 0)
            .max(Comparator.comparingInt(Scored::score))
            .map(Scored::level)
            .orElse(null);
    }

    /**
     * Returns a representative midpoint YOE for a given experience level.
     * Used to populate yearsOfExperience for AI entries so the drawer doesn't show '—'.
     */
    /**
     * Maps years-of-experience (and experience level as tiebreaker) to a
     * standardized_levels.name value using the canonical bands:
     *
     *   SDE 1              1–3  yoe   ENTRY
     *   SDE 2              3–5  yoe   MID
     *   SDE 3              5–8  yoe   SENIOR
     *   Staff Engineer     8–12 yoe   LEAD  (IC track)
     *   Principal Engineer 12–16 yoe  LEAD  (IC track)
     *   Architect          15–20 yoe  LEAD  (senior IC / systems track)
     *   Engineering Manager        MANAGER band (any yoe)
     *   Sr. Engineering Manager    MANAGER band (senior)
     *   Director                   DIRECTOR band
     *   VP                         VP band
     *
     * Overlapping ranges (Architect 15-20 vs Principal 12-16) are disambiguated
     * by experienceLevel — MANAGER/DIRECTOR/VP route to their own tracks regardless of YOE.
     * Returns null if yoe is null and experienceLevel provides no useful signal.
     */
    private String yoeToStandardizedLevelName(Integer yoe, ExperienceLevel experienceLevel) {
        // Non-IC tracks — route by experienceLevel regardless of YOE
        if (experienceLevel != null) {
            switch (experienceLevel) {
                case INTERN   -> { return "Intern"; }          // Fix 1: own band, not SDE 1
                case MANAGER  -> { return "Engineering Manager"; }
                case DIRECTOR -> { return "Director"; }        // Fix 5: explicit, not collapsed
                case VP       -> { return "VP"; }
                case C_LEVEL  -> { return "C-Level"; }        // Fix 4: own band, not VP
                default       -> {} // fall through to YOE-based IC logic
            }
        }

        if (yoe == null) {
            // No YOE — fall back to experienceLevel alone
            if (experienceLevel == null) return null;
            return switch (experienceLevel) {
                case ENTRY  -> "SDE 1";
                case MID    -> "SDE 2";
                case SENIOR -> "SDE 3";
                case LEAD   -> "Staff Engineer";
                default     -> null;
            };
        }

        // IC track: map by YOE band
        if (yoe <= 0)  return "Intern";             // Fix 2: 0 YOE → Intern, not SDE 1
        if (yoe <= 3)  return "SDE 1";              // 1–3y
        if (yoe <= 5)  return "SDE 2";              // 3–5y
        if (yoe <= 8)  return "SDE 3";              // 5–8y
        if (yoe <= 12) return "Staff Engineer";      // 8–12y
        if (yoe < 16)  return "Principal Engineer";  // Fix 3: strict <16, so yoe=16 → Architect
        return "Architect";                          // 16+y
    }

        /**
     * YOE midpoints aligned to the standardized level bands:
     *   SDE 1: 1-3y  → ENTRY  midpoint 2
     *   SDE 2: 3-5y  → MID    midpoint 4
     *   SDE 3: 5-8y  → SENIOR midpoint 6
     *   Staff:  8-12y → LEAD   midpoint 10
     *   Principal: 12-16y → LEAD midpoint 14
     *   Architect: 15-20y → LEAD midpoint 17
     */
    private int deriveYoeFromLevel(ExperienceLevel level) {
        return switch (level) {
            case INTERN   -> 0;
            case ENTRY    -> 2;   // SDE 1 midpoint (1–3y)
            case MID      -> 4;   // SDE 2 midpoint (3–5y)
            case SENIOR   -> 6;   // SDE 3 midpoint (5–8y)
            case LEAD     -> 10;  // Staff/Principal midpoint (8–12y)
            case MANAGER  -> 9;
            case DIRECTOR -> 13;
            case VP       -> 17;
            case C_LEVEL  -> 20;
        };
    }
}
