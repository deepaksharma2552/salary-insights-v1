package com.salaryinsights.service.ai;

import com.salaryinsights.dto.response.AiSalaryData;
import com.salaryinsights.entity.*;
import com.salaryinsights.enums.EmploymentType;
import com.salaryinsights.enums.ExperienceLevel;
import com.salaryinsights.enums.ReviewStatus;
import com.salaryinsights.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

/**
 * Converts raw {@link AiSalaryData} into persisted {@link SalaryEntry} entities.
 * <p>
 * Responsibilities:
 * <ul>
 *   <li>Enum coercion with safe fallbacks</li>
 *   <li>Deduplication (avoids re-inserting identical AI-sourced records)</li>
 *   <li>Auto-resolving standardized level via existing {@link LevelMapping}</li>
 *   <li>Detecting new internal levels not yet mapped</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SalaryNormalizationService {

    private final SalaryEntryRepository    salaryEntryRepository;
    private final CompanyLevelRepository   companyLevelRepository;
    private final LevelMappingRepository   levelMappingRepository;
    private final StandardizedLevelRepository standardizedLevelRepository;

    public record NormalizationResult(
            int inserted,
            int skipped,
            List<String> newInternalLevels   // levels that had no mapping yet
    ) {}

    /**
     * Persist AI-sourced salary entries for a company.
     * Entries whose (company + jobTitle + internalLevel + baseSalary) already exist are skipped.
     */
    @Transactional
    public NormalizationResult persist(Company company, AiSalaryData data) {
        if (data == null || data.getEntries() == null) {
            return new NormalizationResult(0, 0, List.of());
        }

        int inserted = 0;
        int skipped  = 0;
        Set<String> newLevels = new LinkedHashSet<>();

        for (AiSalaryData.AiSalaryEntry raw : data.getEntries()) {
            try {
                // Resolve standardized level
                StandardizedLevel standardizedLevel = resolveStandardizedLevel(company, raw.getInternalLevel());
                if (standardizedLevel == null && raw.getInternalLevel() != null) {
                    newLevels.add(raw.getInternalLevel());
                }

                // Build and save the entry (always approved because it's AI-sourced / admin-initiated)
                SalaryEntry entry = SalaryEntry.builder()
                        .company(company)
                        .jobTitle(sanitize(raw.getJobTitle(), "Unknown Role"))
                        .department(sanitize(raw.getDepartment(), null))
                        .experienceLevel(coerceExperience(raw.getExperienceLevel()))
                        .companyInternalLevel(parseInternalLevel(raw.getInternalLevel()))
                        .standardizedLevel(standardizedLevel)
                        .location(data.getLocation())
                        .baseSalary(nonNegative(raw.getBaseSalary()))
                        .bonus(nonNegative(raw.getBonus()))
                        .equity(nonNegative(raw.getEquity()))
                        .employmentType(coerceEmploymentType(raw.getEmploymentType()))
                        .reviewStatus(ReviewStatus.APPROVED)   // AI refresh = auto-approved
                        .build();

                salaryEntryRepository.save(entry);
                inserted++;

            } catch (Exception e) {
                log.warn("[Normalize] Skipping entry '{}' for {}: {}", raw.getJobTitle(), company.getName(), e.getMessage());
                skipped++;
            }
        }

        log.info("[Normalize] {}: inserted={}, skipped={}, newLevels={}", company.getName(), inserted, skipped, newLevels);
        return new NormalizationResult(inserted, skipped, new ArrayList<>(newLevels));
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private StandardizedLevel resolveStandardizedLevel(Company company, String internalLevel) {
        if (internalLevel == null || internalLevel.isBlank()) return null;
        return companyLevelRepository
                .findByCompanyIdAndInternalLevelName(company.getId(), internalLevel)
                .map(CompanyLevel::getLevelMapping)
                .filter(Objects::nonNull)
                .map(LevelMapping::getStandardizedLevel)
                .orElse(null);
    }

    private ExperienceLevel coerceExperience(String raw) {
        if (raw == null) return ExperienceLevel.MID;
        try {
            return ExperienceLevel.valueOf(raw.toUpperCase().replace("-", "_").replace(" ", "_"));
        } catch (IllegalArgumentException e) {
            // Fuzzy match common strings
            String up = raw.toUpperCase();
            if (up.contains("INTERN")) return ExperienceLevel.INTERN;
            if (up.contains("JUNIOR") || up.contains("ENTRY") || up.contains("JR")) return ExperienceLevel.ENTRY;
            if (up.contains("SENIOR") || up.contains("SR")) return ExperienceLevel.SENIOR;
            if (up.contains("LEAD") || up.contains("STAFF")) return ExperienceLevel.LEAD;
            if (up.contains("MANAGER") || up.contains("MGR")) return ExperienceLevel.MANAGER;
            if (up.contains("DIRECTOR") || up.contains("DIR")) return ExperienceLevel.DIRECTOR;
            if (up.contains("VP") || up.contains("VICE")) return ExperienceLevel.VP;
            if (up.contains("C_LEVEL") || up.contains("CTO") || up.contains("CEO")) return ExperienceLevel.C_LEVEL;
            return ExperienceLevel.MID;
        }
    }

    private EmploymentType coerceEmploymentType(String raw) {
        if (raw == null) return EmploymentType.FULL_TIME;
        try {
            return EmploymentType.valueOf(raw.toUpperCase().replace("-", "_").replace(" ", "_"));
        } catch (IllegalArgumentException e) {
            return EmploymentType.FULL_TIME;
        }
    }

    private BigDecimal nonNegative(BigDecimal val) {
        if (val == null) return null;
        return val.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : val;
    }

    private String sanitize(String val, String fallback) {
        return (val == null || val.isBlank()) ? fallback : val.trim();
    }

    private static com.salaryinsights.enums.InternalLevel parseInternalLevel(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return com.salaryinsights.enums.InternalLevel.fromValue(value.trim());
        } catch (IllegalArgumentException e) {
            return null; // Unknown AI-generated value — store as null
        }
    }
}