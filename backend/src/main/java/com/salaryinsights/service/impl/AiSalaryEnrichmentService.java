package com.salaryinsights.service.ai;

import com.salaryinsights.entity.FunctionLevel;
import com.salaryinsights.entity.User;
import com.salaryinsights.entity.JobFunction;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.ConcurrentHashMap;
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
    private static final long JOB_TTL_MILLIS    = 30 * 60 * 1_000L; // keep jobs for 30 min

    // in-memory rate-limit store: companyNameLower -> lastEnrichmentEpochMs
    private final ConcurrentHashMap<String, Long> lastEnrichmentTime = new ConcurrentHashMap<>();

    // Async job store: jobId -> EnrichJob
    private final ConcurrentHashMap<String, EnrichJob> jobs = new ConcurrentHashMap<>();

    // Single-thread executor for background enrichment runs
    private final ExecutorService enrichExecutor = Executors.newCachedThreadPool();

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
        if (last != null && (Instant.now().toEpochMilli() - last) < RATE_LIMIT_MILLIS) {
            long minutesLeft = (RATE_LIMIT_MILLIS - (Instant.now().toEpochMilli() - last)) / 60_000;
            throw new IllegalStateException(
                "Rate limit: already enriched \"" + companyName + "\" recently. "
                + "Try again in ~" + minutesLeft + " minute(s).");
        }

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
        long cutoff = Instant.now().toEpochMilli() - JOB_TTL_MILLIS;
        jobs.entrySet().removeIf(e -> e.getValue().getCreatedAt() < cutoff);
    }

    private final RestTemplate             restTemplate;
    private final ObjectMapper             objectMapper;
    private final SalaryService            salaryService;
    private final AuditLogService          auditLogService;
    private final JobFunctionRepository    jobFunctionRepository;
    private final FunctionLevelRepository  functionLevelRepository;
    private final UserRepository           userRepository;
    private final com.salaryinsights.repository.SalaryEntryRepository salaryEntryRepository;

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

        // Fetch an admin user to act as submitter — background threads have no security context
        User systemUser = userRepository.findFirstByRole(com.salaryinsights.enums.Role.ADMIN)
                .orElseThrow(() -> new RuntimeException("No admin user found for AI enrichment"));

        // Map and submit each entry via upsert-by-fingerprint
        int inserted = 0;
        int skipped  = 0;
        for (AiSalaryEntry aiEntry : entries) {
            try {
                SalaryRequest req = mapToSalaryRequest(aiEntry, companyName, aiData.getDataSource(), parentLocation);
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

        log.info("[AI Enrich] Complete for {}: {} inserted, {} skipped (stale/no change)",
            companyName, inserted, skipped);
        auditLogService.log("AiEnrichment", companyName, "ENRICH_COMPLETED",
            String.format("AI enrichment for %s — %d new observations inserted, %d skipped. Source: %s",
                companyName, inserted, skipped, aiData.getDataSource()));

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
                  "yearsOfExperience": <typical years of experience as integer, e.g. 1 for ENTRY, 3 for MID, 6 for SENIOR, 9 for LEAD>,
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

    // ── Dedup constants ────────────────────────────────────────────────────────

    /**
     * If the incoming base salary differs from the most recent existing entry
     * by more than this percentage, treat it as a genuinely new observation
     * and insert a fresh PENDING entry regardless of how recent the last one was.
     */
    private static final double SALARY_CHANGE_THRESHOLD_PCT = 0.10; // 10 %

    /**
     * If the most recent existing entry (for the same fingerprint) is older than
     * this many days, insert a fresh entry even if the salary hasn't moved —
     * market data ages out and should be periodically refreshed.
     */
    private static final long STALE_ENTRY_DAYS = 90;

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

            if (changePct > SALARY_CHANGE_THRESHOLD_PCT) {
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

            if (daysSinceCreated >= STALE_ENTRY_DAYS) {
                salaryService.submitSalary(req, systemUser);
                log.info("[AI Enrich] INSERTED (data aged {}d > {}d): {}",
                    daysSinceCreated, STALE_ENTRY_DAYS, req.getJobTitle());
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

        // Normalise equity: Claude returns total grant value (as sourced from levels.fyi /
        // Glassdoor), so we divide by the company's standard vesting period to get the
        // annual equivalent before storing.
        BigDecimal annualEquity = null;
        if (aiEntry.getEquity() != null) {
            int vestingYears = vestingYearsFor(companyName);
            annualEquity = aiEntry.getEquity().divide(BigDecimal.valueOf(vestingYears), 0, RoundingMode.HALF_UP);
            log.debug("[AI Enrich] Equity for '{}' at {}: total={} / {}yr vesting = {} annual",
                aiEntry.getJobTitle(), companyName,
                aiEntry.getEquity().toPlainString(), vestingYears, annualEquity.toPlainString());
        }
        req.setEquity(annualEquity);

        // Use YOE from AI response if provided, otherwise derive midpoint from experienceLevel
        // so the drawer never shows '—' for AI entries
        if (aiEntry.getYearsOfExperience() != null && aiEntry.getYearsOfExperience() >= 0) {
            req.setYearsOfExperience(aiEntry.getYearsOfExperience());
        } else if (req.getExperienceLevel() != null) {
            req.setYearsOfExperience(deriveYoeFromLevel(req.getExperienceLevel()));
        }

        // Set data source — use what Claude reported (e.g. "levels.fyi, glassdoor"), fall back to "AI"
        String source = (dataSource != null && !dataSource.isBlank()) ? dataSource : "AI";
        req.setDataSource(source);

        // Preserve the raw total grant so admin UI can display both values
        if (aiEntry.getEquity() != null) {
            req.setEquityTotalGrant(aiEntry.getEquity());
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

        // Resolve job function + level from the AI-returned department/jobTitle
        // This maps e.g. "Product Designer" → Design function → Designer (Senior) level
        try {
            JobFunction fn = resolveJobFunction(aiEntry.getDepartment(), aiEntry.getJobTitle());
            if (fn != null) {
                req.setJobFunctionId(fn.getId());
                FunctionLevel fl = resolveFunctionLevel(fn, aiEntry.getJobTitle(), req.getExperienceLevel());
                if (fl != null) {
                    req.setFunctionLevelId(fl.getId());
                    log.debug("[AI Enrich] Resolved '{}' → function='{}' level='{}'",
                        aiEntry.getJobTitle(), fn.getDisplayName(), fl.getName());
                } else {
                    log.debug("[AI Enrich] Function '{}' found but no level match for '{}'",
                        fn.getDisplayName(), aiEntry.getJobTitle());
                }
            }
        } catch (Exception e) {
            // Non-fatal — entry saves without function mapping, admin can set it manually
            log.warn("[AI Enrich] Function/level resolution failed for '{}': {}",
                aiEntry.getJobTitle(), e.getMessage());
        }

        // Audit log — captures internalLevel, dataSource, equity normalisation, and function resolution
        int vestingYears = aiEntry.getEquity() != null ? vestingYearsFor(companyName) : 0;
        String auditDetails = String.format(
            "[AI:%s] %s | internalLevel=%s | experienceLevel=%s | base=%.0f INR | equity=%s (/%dyr vesting)",
            dataSource != null ? dataSource : "ai_inference",
            req.getJobTitle(),
            aiEntry.getInternalLevel() != null ? aiEntry.getInternalLevel() : "n/a",
            req.getExperienceLevel() != null ? req.getExperienceLevel().name() : "auto",
            req.getBaseSalary(),
            annualEquity != null ? annualEquity.toPlainString() : "null",
            vestingYears
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

    // ── Job function / level resolution ────────────────────────────────────────

    /**
     * Department → function keyword map.
     * Keys are lowercased substrings to match against the AI-returned department string.
     * Values are the canonical job_functions.name values in the DB.
     */
    private static final Map<String, String> DEPT_TO_FUNCTION = Map.ofEntries(
        Map.entry("engineer",  "ENGINEERING"),
        Map.entry("software",  "ENGINEERING"),
        Map.entry("backend",   "ENGINEERING"),
        Map.entry("frontend",  "ENGINEERING"),
        Map.entry("fullstack", "ENGINEERING"),
        Map.entry("sre",       "ENGINEERING"),
        Map.entry("devops",    "ENGINEERING"),
        Map.entry("data",      "ENGINEERING"),
        Map.entry("ml",        "ENGINEERING"),
        Map.entry("ai",        "ENGINEERING"),
        Map.entry("product",   "PRODUCT"),
        Map.entry("pm ",       "PRODUCT"),
        Map.entry("program",   "PROGRAM"),
        Map.entry("design",    "DESIGN"),
        Map.entry("ux",        "DESIGN"),
        Map.entry("ui",        "DESIGN"),
        Map.entry("research",  "DESIGN"),
        Map.entry("analytics", "ANALYTICS"),
        Map.entry("analyst",   "ANALYTICS"),
        Map.entry("finance",   "FINANCE"),
        Map.entry("legal",     "LEGAL"),
        Map.entry("hr",        "HR"),
        Map.entry("people",    "HR"),
        Map.entry("recruit",   "HR"),
        Map.entry("sales",     "SALES"),
        Map.entry("marketing", "MARKETING"),
        Map.entry("growth",    "MARKETING"),
        Map.entry("content",   "MARKETING"),
        Map.entry("ops",       "OPERATIONS"),
        Map.entry("operation", "OPERATIONS"),
        Map.entry("support",   "SUPPORT"),
        Map.entry("customer",  "SUPPORT")
    );

    /**
     * Resolves a department string to a JobFunction from the DB using fuzzy keyword matching.
     * Returns null if no match — entry still saves, just without a function mapping.
     */
    private JobFunction resolveJobFunction(String department, String jobTitle) {
        // Load all functions once (small table, cached by JPA first-level cache)
        List<JobFunction> allFunctions = jobFunctionRepository.findAllWithLevels();
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

            // Title keyword match (e.g. "Product Designer" → prefers level named "Designer")
            String[] titleWords = titleLower.split("\\s+");
            for (String word : titleWords) {
                if (word.length() > 3 && lvlLower.contains(word)) score += 2;
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
    private int deriveYoeFromLevel(ExperienceLevel level) {
        return switch (level) {
            case INTERN   -> 0;
            case ENTRY    -> 1;
            case MID      -> 3;
            case SENIOR   -> 6;
            case LEAD     -> 9;
            case MANAGER  -> 8;
            case DIRECTOR -> 12;
            case VP       -> 15;
            case C_LEVEL  -> 18;
        };
    }
}
