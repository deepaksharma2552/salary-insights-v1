package com.salaryinsights.service.ai;

import com.salaryinsights.dto.response.AiRefreshResult;
import com.salaryinsights.dto.response.AiSalaryData;
import com.salaryinsights.entity.Company;
import com.salaryinsights.entity.StandardizedLevel;
import com.salaryinsights.enums.CompanyStatus;
import com.salaryinsights.repository.CompanyRepository;
import com.salaryinsights.repository.StandardizedLevelRepository;
import com.salaryinsights.service.impl.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

/**
 * Orchestrates the full AI refresh pipeline:
 * <ol>
 *   <li>Load active companies (or a single company)</li>
 *   <li>For each company call {@link WebDataFetcherService} → get structured salary JSON</li>
 *   <li>Normalize & persist via {@link SalaryNormalizationService}</li>
 *   <li>Detect new internal levels → call LLM for mapping suggestions</li>
 *   <li>Assemble and return {@link AiRefreshResult}</li>
 * </ol>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiRefreshService {

    private final CompanyRepository            companyRepository;
    private final StandardizedLevelRepository  standardizedLevelRepository;
    private final WebDataFetcherService        webDataFetcher;
    private final SalaryNormalizationService   normalizationService;
    private final AuditLogService              auditLogService;

    /**
     * Refresh ALL active companies.
     */
    public AiRefreshResult refreshAll() {
        List<Company> companies = companyRepository
                .findByStatus(CompanyStatus.ACTIVE, PageRequest.of(0, 100))
                .getContent();
        log.info("[AiRefresh] Starting refresh for {} active companies", companies.size());
        return runRefresh(companies);
    }

    /**
     * Refresh a SINGLE company by ID.
     */
    public AiRefreshResult refreshOne(UUID companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Company not found: " + companyId));
        log.info("[AiRefresh] Starting single-company refresh for: {}", company.getName());
        return runRefresh(List.of(company));
    }

    // ─────────────────────────────────────────────────────────────────────────

    private AiRefreshResult runRefresh(List<Company> companies) {
        long startMs = System.currentTimeMillis();

        List<String> standardizedLevelNames = standardizedLevelRepository.findAll()
                .stream()
                .sorted(Comparator.comparingInt(StandardizedLevel::getHierarchyRank))
                .map(StandardizedLevel::getName)
                .collect(Collectors.toList());

        List<AiRefreshResult.CompanyRefreshSummary> summaries = new ArrayList<>();
        List<AiRefreshResult.MappingSuggestion>     suggestions = new ArrayList<>();
        int totalNewSalaries = 0;
        int totalNewLevels   = 0;

        for (Company company : companies) {
            AiRefreshResult.CompanyRefreshSummary summary = processCompany(
                    company, standardizedLevelNames, suggestions);
            summaries.add(summary);

            if (!"FAILED".equals(summary.getStatus())) {
                totalNewSalaries += summary.getNewSalaries();
                totalNewLevels   += summary.getNewLevels();
            }
        }

        long duration = System.currentTimeMillis() - startMs;
        long failed   = summaries.stream().filter(s -> "FAILED".equals(s.getStatus())).count();
        String status = failed == 0 ? "SUCCESS"
                : failed == companies.size() ? "FAILED"
                : "PARTIAL";

        AiRefreshResult result = AiRefreshResult.builder()
                .status(status)
                .companiesProcessed(companies.size())
                .newSalariesAdded(totalNewSalaries)
                .salariesUpdated(0)
                .levelsDetected(totalNewLevels)
                .mappingSuggestions(suggestions.size())
                .companyResults(summaries)
                .mappingSuggestionList(suggestions)
                .message(buildMessage(companies.size(), totalNewSalaries, suggestions.size(), status))
                .durationMs(duration)
                .completedAt(LocalDateTime.now())
                .build();

        auditLogService.log("AiRefresh", "all", "AI_REFRESH",
                String.format("AI refresh %s: %d companies, %d new salaries, %d mapping suggestions in %dms",
                        status, companies.size(), totalNewSalaries, suggestions.size(), duration));

        log.info("[AiRefresh] Completed: {}", result.getMessage());
        return result;
    }

    private AiRefreshResult.CompanyRefreshSummary processCompany(
            Company company,
            List<String> standardizedLevelNames,
            List<AiRefreshResult.MappingSuggestion> suggestions) {

        try {
            // 1. Fetch salary data via LLM
            AiSalaryData data = webDataFetcher.fetchSalaryData(company);

            // 2. Normalize and persist
            SalaryNormalizationService.NormalizationResult norm =
                    normalizationService.persist(company, data);

            // 3. For each new internal level, ask LLM for a mapping suggestion
            for (String newLevel : norm.newInternalLevels()) {
                try {
                    WebDataFetcherService.LevelMappingSuggestion suggestion =
                            webDataFetcher.suggestLevelMapping(
                                    company.getName(), newLevel, standardizedLevelNames);

                    suggestions.add(AiRefreshResult.MappingSuggestion.builder()
                            .companyName(company.getName())
                            .companyId(company.getId().toString())
                            .internalLevelName(newLevel)
                            .suggestedStandardizedLevel(suggestion.suggestedStandardizedLevel())
                            .reasoning(suggestion.reasoning())
                            .confidence(suggestion.confidence())
                            .build());
                } catch (Exception e) {
                    log.warn("[AiRefresh] Could not get mapping suggestion for '{}' at {}: {}",
                            newLevel, company.getName(), e.getMessage());
                }
            }

            return AiRefreshResult.CompanyRefreshSummary.builder()
                    .companyId(company.getId().toString())
                    .companyName(company.getName())
                    .newSalaries(norm.inserted())
                    .newLevels(norm.newInternalLevels().size())
                    .status("SUCCESS")
                    .build();

        } catch (AiUnavailableException e) {
            log.error("[AiRefresh] AI unavailable for {}: {}", company.getName(), e.getMessage());
            return AiRefreshResult.CompanyRefreshSummary.builder()
                    .companyId(company.getId().toString())
                    .companyName(company.getName())
                    .newSalaries(0).newLevels(0)
                    .status("FAILED")
                    .error(e.getMessage())
                    .build();
        } catch (Exception e) {
            log.error("[AiRefresh] Unexpected error for {}: {}", company.getName(), e.getMessage(), e);
            return AiRefreshResult.CompanyRefreshSummary.builder()
                    .companyId(company.getId().toString())
                    .companyName(company.getName())
                    .newSalaries(0).newLevels(0)
                    .status("FAILED")
                    .error("Internal error: " + e.getMessage())
                    .build();
        }
    }

    private String buildMessage(int companies, int salaries, int suggestions, String status) {
        return String.format("Refresh %s — processed %d companies, added %d salary records, %d mapping suggestions.",
                status, companies, salaries, suggestions);
    }
}
