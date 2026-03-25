package com.salaryinsights.service.impl;

import com.salaryinsights.dto.request.SalaryRequest;
import com.salaryinsights.dto.response.*;
import com.salaryinsights.entity.*;
import com.salaryinsights.enums.ExperienceLevel;
import com.salaryinsights.enums.ReviewStatus;
import com.salaryinsights.exception.BadRequestException;
import com.salaryinsights.exception.ResourceNotFoundException;
import com.salaryinsights.mapper.SalaryMapper;
import com.salaryinsights.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import com.salaryinsights.repository.JobFunctionRepository;
import com.salaryinsights.repository.FunctionLevelRepository;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SalaryService {

    private final SalaryEntryRepository salaryEntryRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final SalaryMapper salaryMapper;
    private final AuditLogService auditLogService;
    private final JobFunctionRepository    jobFunctionRepository;
    private final FunctionLevelRepository  functionLevelRepository;
    private final com.salaryinsights.repository.OpportunityRepository opportunityRepository;

    @Transactional(readOnly = true)
    public PagedResponse<SalaryResponse> getMySubmissions(Pageable pageable) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Page<SalaryEntry> page = salaryEntryRepository.findBySubmittedByEmail(email, pageable);
        List<SalaryResponse> content = page.getContent().stream()
                .map(salaryMapper::toResponse)
                .collect(java.util.stream.Collectors.toList());
        return PagedResponse.<SalaryResponse>builder()
                .content(content)
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .build();
    }

    @Transactional(readOnly = true)
    public PagedResponse<SalaryResponse> getApprovedSalaries(
            UUID companyId, String companyName, String jobTitle,
            java.util.List<String> locations, java.util.List<String> experienceLevelStrs,
            Pageable pageable) {
        return getApprovedSalaries(companyId, companyName, jobTitle, locations, experienceLevelStrs, null, null, pageable);
    }

    @Transactional(readOnly = true)
    public PagedResponse<SalaryResponse> getApprovedSalaries(
            UUID companyId, String companyName, String jobTitle,
            java.util.List<String> locations, java.util.List<String> experienceLevelStrs,
            java.util.List<String> internalLevelStrs,
            Pageable pageable) {
        return getApprovedSalaries(companyId, companyName, jobTitle, locations, experienceLevelStrs, internalLevelStrs, null, pageable);
    }

    @Transactional(readOnly = true)
    public PagedResponse<SalaryResponse> getApprovedSalaries(
            UUID companyId, String companyName, String jobTitle,
            java.util.List<String> locations, java.util.List<String> experienceLevelStrs,
            String employmentTypeStr,
            Pageable pageable) {
        return getApprovedSalaries(companyId, companyName, jobTitle, locations, experienceLevelStrs, null, employmentTypeStr, pageable);
    }

    @Transactional(readOnly = true)
    public PagedResponse<SalaryResponse> getApprovedSalaries(
            UUID companyId, String companyName, String jobTitle,
            java.util.List<String> locations, java.util.List<String> experienceLevelStrs,
            java.util.List<String> internalLevelStrs,
            String employmentTypeStr,
            Pageable pageable) {

        final String companyNameFilter = (companyName != null && !companyName.isBlank()) ? companyName.toLowerCase() : null;
        final String jobTitleFilter    = (jobTitle    != null && !jobTitle.isBlank())    ? jobTitle.toLowerCase()    : null;
        final UUID   companyIdFilter   = companyId;

        // Convert display names ("Bengaluru") or enum names ("BENGALURU") → DB enum names
        final java.util.List<String> locationEnumNames = (locations != null && !locations.isEmpty())
            ? locations.stream()
                .map(l -> {
                    for (com.salaryinsights.enums.Location loc : com.salaryinsights.enums.Location.values()) {
                        if (loc.getDisplayName().equalsIgnoreCase(l) || loc.name().equalsIgnoreCase(l)) return loc.name();
                    }
                    return l;
                })
                .collect(java.util.stream.Collectors.toList())
            : null;

        // Convert raw strings → ExperienceLevel enums, silently skipping unknowns
        final java.util.List<ExperienceLevel> levelFilters = (experienceLevelStrs != null && !experienceLevelStrs.isEmpty())
            ? experienceLevelStrs.stream()
                .map(s -> { try { return ExperienceLevel.valueOf(s.toUpperCase()); } catch (IllegalArgumentException e) { return null; } })
                .filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toList())
            : null;

        // Convert raw strings → InternalLevel enums, silently skipping unknowns
        final java.util.List<com.salaryinsights.enums.InternalLevel> internalLevelFilters =
            (internalLevelStrs != null && !internalLevelStrs.isEmpty())
            ? internalLevelStrs.stream()
                .map(s -> { try { return com.salaryinsights.enums.InternalLevel.valueOf(s.toUpperCase()); } catch (IllegalArgumentException e) { return null; } })
                .filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toList())
            : null;

        // Convert employmentType string → EmploymentType enum, null if blank/unknown
        com.salaryinsights.enums.EmploymentType employmentTypeFilterTmp = null;
        if (employmentTypeStr != null && !employmentTypeStr.isBlank()) {
            try { employmentTypeFilterTmp = com.salaryinsights.enums.EmploymentType.valueOf(employmentTypeStr.toUpperCase()); }
            catch (IllegalArgumentException ignored) { }
        }
        final com.salaryinsights.enums.EmploymentType employmentTypeFilter = employmentTypeFilterTmp;

        org.springframework.data.jpa.domain.Specification<SalaryEntry> spec =
            (root, query, cb) -> {
                boolean isCountQuery = query.getResultType() == Long.class || query.getResultType() == long.class;

                jakarta.persistence.criteria.Join<Object, Object> companyJoin =
                    root.join("company", jakarta.persistence.criteria.JoinType.LEFT);

                if (!isCountQuery) {
                    root.fetch("company", jakarta.persistence.criteria.JoinType.LEFT);
                    root.fetch("standardizedLevel", jakarta.persistence.criteria.JoinType.LEFT);
                    query.distinct(true);
                }

                java.util.List<jakarta.persistence.criteria.Predicate> predicates = new java.util.ArrayList<>();
                predicates.add(cb.equal(root.get("reviewStatus"), com.salaryinsights.enums.ReviewStatus.APPROVED));

                if (companyIdFilter != null) {
                    predicates.add(cb.equal(companyJoin.get("id"), companyIdFilter));
                }
                if (companyNameFilter != null || jobTitleFilter != null) {
                    String searchTerm = companyNameFilter != null ? companyNameFilter : jobTitleFilter;
                    predicates.add(cb.or(
                        cb.like(cb.lower(companyJoin.get("name")), "%" + searchTerm + "%"),
                        cb.like(cb.lower(root.get("jobTitle")), "%" + searchTerm + "%")
                    ));
                }
                // Multi-location IN predicate
                if (locationEnumNames != null && !locationEnumNames.isEmpty()) {
                    predicates.add(root.get("location").in(locationEnumNames));
                }
                // Multi-level IN predicate (ExperienceLevel)
                if (levelFilters != null && !levelFilters.isEmpty()) {
                    predicates.add(root.get("experienceLevel").in(levelFilters));
                }
                // Multi-internalLevel IN predicate (company-specific levels e.g. SDE_1)
                if (internalLevelFilters != null && !internalLevelFilters.isEmpty()) {
                    predicates.add(root.get("companyInternalLevel").in(internalLevelFilters));
                }
                // Employment type filter
                if (employmentTypeFilter != null) {
                    predicates.add(cb.equal(root.get("employmentType"), employmentTypeFilter));
                }

                return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
            };

        Page<SalaryEntry> page = salaryEntryRepository.findAll(spec, pageable);
        // Force mapping inside the transaction so lazy fields can be accessed
        List<SalaryResponse> mapped = page.getContent().stream()
                .map(salaryMapper::toResponse)
                .collect(java.util.stream.Collectors.toList());
        return PagedResponse.<SalaryResponse>builder()
                .content(mapped)
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .build();
    }

    @Transactional(readOnly = true)
    public PagedResponse<SalaryResponse> getPendingSalaries(Pageable pageable) {
        long totalPending = salaryEntryRepository.countByReviewStatus(ReviewStatus.PENDING);
        log.info("getPendingSalaries called — total PENDING in DB: {}, page: {}", totalPending, pageable);
        Page<SalaryEntry> page = salaryEntryRepository.findByReviewStatusWithDetails(ReviewStatus.PENDING, pageable);
        log.info("findByReviewStatus returned {} entries on this page", page.getNumberOfElements());
        // Force mapping inside the transaction so lazy fields (company, submittedBy) can be accessed
        List<SalaryResponse> mapped = page.getContent().stream()
                .map(entry -> {
                    try {
                        return salaryMapper.toResponse(entry);
                    } catch (Exception e) {
                        log.error("Failed to map SalaryEntry id={}: {}", entry.getId(), e.getMessage(), e);
                        throw e;
                    }
                })
                .collect(java.util.stream.Collectors.toList());
        log.info("Mapped {} entries successfully", mapped.size());
        return PagedResponse.<SalaryResponse>builder()
                .content(mapped)
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .build();
    }

    @Transactional(readOnly = true)
    public SalaryResponse getSalaryById(UUID id) {
        SalaryEntry entry = salaryEntryRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Salary entry not found: " + id));
        return salaryMapper.toResponse(entry);
    }

    @Transactional
    public SalaryResponse submitSalary(SalaryRequest request) {
        Company company;
        if (request.getCompanyId() != null) {
            // Existing company selected from autocomplete
            company = companyRepository.findById(request.getCompanyId())
                    .orElseThrow(() -> new ResourceNotFoundException("Company not found: " + request.getCompanyId()));
        } else if (request.getCompanyName() != null && !request.getCompanyName().isBlank()) {
            // Auto-create or find by name
            company = companyRepository.findByNameIgnoreCase(request.getCompanyName().trim())
                    .orElseGet(() -> {
                        com.salaryinsights.entity.Company newCompany = com.salaryinsights.entity.Company.builder()
                                .name(request.getCompanyName().trim())
                                .status(com.salaryinsights.enums.CompanyStatus.ACTIVE)
                                .build();
                        com.salaryinsights.entity.Company saved = companyRepository.save(newCompany);
                        log.info("Auto-created company: {}", saved.getName());
                        auditLogService.log("Company", saved.getId().toString(), "AUTO_CREATED",
                                "Company auto-created during salary submission: " + saved.getName());
                        return saved;
                    });
        } else {
            throw new com.salaryinsights.exception.BadRequestException("Either companyId or companyName must be provided");
        }

        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User submitter = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Standardized level mapping removed — always null
        StandardizedLevel standardizedLevel = null;

        SalaryEntry entry = salaryMapper.toEntity(request);
        // Auto-derive experienceLevel when not provided — DB column is NOT NULL
        if (entry.getExperienceLevel() == null) {
            entry.setExperienceLevel(deriveExperienceLevel(request));
        }
        entry.setCompany(company);
        entry.setSubmittedBy(submitter);
        entry.setStandardizedLevel(standardizedLevel);

        // Resolve job function + function level if provided.
        // Also derive companyInternalLevel from the level name if not explicitly set —
        // avoids asking the user for a duplicate field on the submit form.
        // Use a final reference — entry is reassigned after save() so can't be captured directly
        final SalaryEntry entryRef = entry;
        if (request.getJobFunctionId() != null) {
            jobFunctionRepository.findById(request.getJobFunctionId())
                    .ifPresent(entryRef::setJobFunction);
        }
        if (request.getFunctionLevelId() != null) {
            functionLevelRepository.findById(request.getFunctionLevelId())
                    .ifPresent(fl -> {
                        entryRef.setFunctionLevel(fl);
                        // Use the admin-configured mapping stored on the level — no name-string matching.
                        // If the admin hasn't mapped this level, companyInternalLevel stays null.
                        if (entryRef.getCompanyInternalLevel() == null && fl.getInternalLevel() != null) {
                            entryRef.setCompanyInternalLevel(fl.getInternalLevel());
                        }
                    });
        }

        entry.setReviewStatus(ReviewStatus.PENDING);

        entry = salaryEntryRepository.save(entry);
        log.info("Salary SAVED — id={}, reviewStatus={}, company={}, submittedBy={}",
                entry.getId(), entry.getReviewStatus(), company.getName(), currentUserEmail);
        auditLogService.log("SalaryEntry", entry.getId().toString(), "SUBMITTED",
                "Submitted salary for " + company.getName());

        return salaryMapper.toResponse(entry);
    }

    // Derives ExperienceLevel from yearsOfExperience, falling back to companyInternalLevel mapping
    private ExperienceLevel deriveExperienceLevel(com.salaryinsights.dto.request.SalaryRequest request) {
        if (request.getYearsOfExperience() != null) {
            int y = request.getYearsOfExperience();
            if (y <= 1)  return ExperienceLevel.INTERN;
            if (y <= 2)  return ExperienceLevel.ENTRY;
            if (y <= 5)  return ExperienceLevel.MID;
            if (y <= 8)  return ExperienceLevel.SENIOR;
            if (y <= 12) return ExperienceLevel.LEAD;
            if (y <= 16) return ExperienceLevel.MANAGER;
            if (y <= 20) return ExperienceLevel.DIRECTOR;
            return ExperienceLevel.VP;
        }
        if (request.getCompanyInternalLevel() != null) {
            return switch (request.getCompanyInternalLevel()) {
                case SDE_1                -> ExperienceLevel.ENTRY;
                case SDE_2                -> ExperienceLevel.MID;
                case SDE_3                -> ExperienceLevel.SENIOR;
                case STAFF_ENGINEER,
                     PRINCIPAL_ENGINEER,
                     ARCHITECT            -> ExperienceLevel.LEAD;
                case ENGINEERING_MANAGER,
                     SR_ENGINEERING_MANAGER -> ExperienceLevel.MANAGER;
                case DIRECTOR,
                     SR_DIRECTOR          -> ExperienceLevel.DIRECTOR;
                case VP                   -> ExperienceLevel.VP;
            };
        }
        return ExperienceLevel.MID; // safe default
    }

    @Transactional
    @org.springframework.cache.annotation.Caching(evict = {
        @org.springframework.cache.annotation.CacheEvict(value = "analytics",   allEntries = true),
        @org.springframework.cache.annotation.CacheEvict(value = "companyList", allEntries = true)
    })
    public SalaryResponse reviewSalary(UUID id, ReviewStatus status, String reason) {
        if (status == ReviewStatus.PENDING) {
            throw new BadRequestException("Cannot set status to PENDING");
        }

        SalaryEntry entry = salaryEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Salary entry not found: " + id));

        if (entry.getReviewStatus() != ReviewStatus.PENDING) {
            throw new BadRequestException("Entry has already been reviewed");
        }

        entry.setReviewStatus(status);
        if (status == ReviewStatus.REJECTED && reason != null) {
            entry.setRejectionReason(reason);
        }

        entry = salaryEntryRepository.save(entry);

        // Keep tc_min/tc_max on the company row fresh when a salary is approved
        if (status == ReviewStatus.APPROVED && entry.getCompany() != null) {
            UUID companyId = entry.getCompany().getId();
            companyRepository.findById(companyId).ifPresent(company -> {
                java.math.BigDecimal newMin = salaryEntryRepository.minTCByCompany(companyId);
                java.math.BigDecimal newMax = salaryEntryRepository.maxTCByCompany(companyId);
                company.setTcMin(newMin);
                company.setTcMax(newMax);
                companyRepository.save(company);
            });
        }

        auditLogService.log("SalaryEntry", id.toString(), status.name(),
                "Salary " + status.name().toLowerCase() + " for company: " + entry.getCompany().getName());

        return salaryMapper.toResponse(entry);
    }

    // Analytics
    @Transactional(readOnly = true)
    @org.springframework.cache.annotation.Cacheable(value = "analytics", key = "'byYoe'")
    public List<com.salaryinsights.dto.response.YoeSalaryDTO> getAvgSalaryByYoe() {
        return salaryEntryRepository.avgSalaryByYoeRaw().stream().map(row -> {
            Integer yoe      = row[0] != null ? ((Number) row[0]).intValue()    : null;
            Double  base     = row[1] != null ? ((Number) row[1]).doubleValue() : null;
            Double  bonus    = row[2] != null ? ((Number) row[2]).doubleValue() : null;
            Double  equity   = row[3] != null ? ((Number) row[3]).doubleValue() : null;
            Double  total    = row[4] != null ? ((Number) row[4]).doubleValue() : null;
            Long    count    = row[5] != null ? ((Number) row[5]).longValue()   : 0L;
            return new com.salaryinsights.dto.response.YoeSalaryDTO(yoe, base, bonus, equity, total, count);
        }).collect(java.util.stream.Collectors.toList());
    }

    @Transactional(readOnly = true)
    @org.springframework.cache.annotation.Cacheable(value = "analytics", key = "'byLocation'")
    public List<SalaryAggregationDTO> getAvgSalaryByLocation() {
        return salaryEntryRepository.avgSalaryByLocationRaw().stream().map(row -> {
            String enumName = row[0] != null ? row[0].toString() : null;
            String displayName = enumName;
            if (enumName != null) {
                try {
                    com.salaryinsights.enums.Location loc = com.salaryinsights.enums.Location.valueOf(enumName);
                    displayName = loc.getDisplayName();
                } catch (IllegalArgumentException ignored) { }
            }
            Double avgBase  = row[1] != null ? ((Number) row[1]).doubleValue() : null;
            Double avgBonus = row[2] != null ? ((Number) row[2]).doubleValue() : null;
            Double avgEquity= row[3] != null ? ((Number) row[3]).doubleValue() : null;
            Double avgTotal = row[4] != null ? ((Number) row[4]).doubleValue() : null;
            Long   count    = row[5] != null ? ((Number) row[5]).longValue()   : 0L;
            SalaryAggregationDTO dto = new SalaryAggregationDTO();
            dto.setGroupKey(displayName);
            dto.setAvgBaseSalary(avgBase);
            dto.setAvgBonus(avgBonus);
            dto.setAvgEquity(avgEquity);
            dto.setAvgTotalCompensation(avgTotal);
            dto.setCount(count);
            return dto;
        }).collect(java.util.stream.Collectors.toList());
    }

    @Transactional(readOnly = true)
    @org.springframework.cache.annotation.Cacheable(value = "analytics", key = "'byLocationLevel'")
    public List<com.salaryinsights.dto.response.LocationLevelSalaryDTO> getAvgSalaryByLocationAndLevel() {
        return salaryEntryRepository.avgSalaryByLocationAndLevelRaw().stream().map(row -> {
            // col: location[0], internalLevel[1], avgBaseSalary[2], avgBonus[3], avgEquity[4], avgTotalComp[5], cnt[6]
            String enumName    = row[0] != null ? row[0].toString() : null;
            String displayName = enumName;
            if (enumName != null) {
                try {
                    com.salaryinsights.enums.Location loc = com.salaryinsights.enums.Location.valueOf(enumName);
                    displayName = loc.getDisplayName();
                } catch (IllegalArgumentException ignored) {}
            }
            com.salaryinsights.dto.response.LocationLevelSalaryDTO dto =
                new com.salaryinsights.dto.response.LocationLevelSalaryDTO();
            dto.setLocation(displayName);
            dto.setInternalLevel(row[1] != null ? row[1].toString() : null);
            dto.setAvgBaseSalary(row[2] != null ? ((Number) row[2]).doubleValue() : null);
            dto.setAvgBonus(row[3] != null ? ((Number) row[3]).doubleValue() : null);
            dto.setAvgEquity(row[4] != null ? ((Number) row[4]).doubleValue() : null);
            dto.setAvgTotalCompensation(row[5] != null ? ((Number) row[5]).doubleValue() : null);
            dto.setCount(row[6] != null ? ((Number) row[6]).longValue() : 0L);
            return dto;
        }).collect(java.util.stream.Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SalaryAggregationDTO> getAvgSalaryByInternalLevel(List<String> locationDisplayNames) {
        // Convert display names (e.g. "Delhi-NCR") → DB enum names (e.g. "DELHI_NCR")
        // Empty list means no filter — pass null so the SQL COALESCE trick short-circuits
        List<String> locationEnumNames = null;
        if (locationDisplayNames != null && !locationDisplayNames.isEmpty()) {
            locationEnumNames = locationDisplayNames.stream()
                .map(name -> {
                    for (com.salaryinsights.enums.Location loc : com.salaryinsights.enums.Location.values()) {
                        if (loc.getDisplayName().equalsIgnoreCase(name) || loc.name().equalsIgnoreCase(name)) {
                            return loc.name();
                        }
                    }
                    return name; // pass through unknown values — SQL IN will just not match
                })
                .collect(java.util.stream.Collectors.toList());
        }

        List<Object[]> rows = (locationEnumNames == null || locationEnumNames.isEmpty())
            ? salaryEntryRepository.avgSalaryByInternalLevelRaw()
            : salaryEntryRepository.avgSalaryByInternalLevelFilteredRaw(locationEnumNames);

        return rows.stream().map(row -> {
            String groupKey = row[0] != null ? row[0].toString() : null;
            Double avgBase  = row[1] != null ? ((Number) row[1]).doubleValue() : null;
            Double avgBonus = row[2] != null ? ((Number) row[2]).doubleValue() : null;
            Double avgEquity= row[3] != null ? ((Number) row[3]).doubleValue() : null;
            Double avgTotal = row[4] != null ? ((Number) row[4]).doubleValue() : null;
            Long   count    = row[5] != null ? ((Number) row[5]).longValue()   : 0L;
            SalaryAggregationDTO dto = new SalaryAggregationDTO();
            dto.setGroupKey(groupKey);
            dto.setAvgBaseSalary(avgBase);
            dto.setAvgBonus(avgBonus);
            dto.setAvgEquity(avgEquity);
            dto.setAvgTotalCompensation(avgTotal);
            dto.setCount(count);
            return dto;
        }).collect(java.util.stream.Collectors.toList());
    }

    /**
     * Two-signal confidence score (mirrors Glassdoor / Levels.fyi approach):
     *   score = log(count + 1)  ×  recency_factor
     * recency_factor = e^(-λ × months_since_last_entry), λ = 0.05
     * Tiers:  HIGH ≥ 1.5 · MEDIUM ≥ 0.6 · LOW < 0.6
     * Suppressed (tier = "INSUFFICIENT") when count < 2.
     */
    private String[] computeConfidence(long count, LocalDateTime mostRecent) {
        if (count < 2) {
            return new String[]{"INSUFFICIENT", "Insufficient data · " + count + " entr" + (count == 1 ? "y" : "ies")};
        }
        double monthsAgo = mostRecent != null
            ? ChronoUnit.DAYS.between(mostRecent, LocalDateTime.now()) / 30.0
            : 24.0; // assume stale if unknown
        double recencyFactor = Math.exp(-0.05 * monthsAgo);
        double score = Math.log(count + 1) * recencyFactor;
        String tier;
        if (score >= 1.5)      tier = "HIGH";
        else if (score >= 0.6) tier = "MEDIUM";
        else                   tier = "LOW";
        long mo = Math.round(monthsAgo);
        String recencyStr = mo <= 1 ? "updated recently"
            : mo < 12 ? "updated " + mo + "mo ago"
            : "updated " + (mo / 12) + "yr ago";
        String label = tier.charAt(0) + tier.substring(1).toLowerCase()
            + " · " + count + " entr" + (count == 1 ? "y" : "ies")
            + " · " + recencyStr;
        return new String[]{tier, label};
    }

    @Transactional(readOnly = true)
    @org.springframework.cache.annotation.Cacheable(value = "analytics", key = "'byCompany'")
    public List<SalaryAggregationDTO> getAvgSalaryByCompany() {
        return salaryEntryRepository.avgSalaryByCompanyRaw().stream().map(row -> {
            // col order: groupKey[0], companyId[1], logoUrl[2], website[3],
            //            avgBaseSalary[4], avgBonus[5], avgEquity[6], avgTotalComp[7], cnt[8], mostRecentEntry[9]
            String name            = row[0] != null ? row[0].toString() : null;
            String companyId       = row[1] != null ? row[1].toString() : null;
            String logoUrl         = row[2] != null ? row[2].toString() : null;
            String website         = row[3] != null ? row[3].toString() : null;
            Double avgBase         = row[4] != null ? ((Number) row[4]).doubleValue() : null;
            Double avgBonus        = row[5] != null ? ((Number) row[5]).doubleValue() : null;
            Double avgEquity       = row[6] != null ? ((Number) row[6]).doubleValue() : null;
            Double avgTotal        = row[7] != null ? ((Number) row[7]).doubleValue() : null;
            Long   count           = row[8] != null ? ((Number) row[8]).longValue()   : 0L;
            LocalDateTime recent   = row[9] != null ? ((java.sql.Timestamp) row[9]).toLocalDateTime() : null;
            String[] conf          = computeConfidence(count, recent);
            SalaryAggregationDTO dto = new SalaryAggregationDTO();
            dto.setGroupKey(name);
            dto.setCompanyId(companyId);
            dto.setLogoUrl(logoUrl);
            dto.setWebsite(website);
            dto.setAvgBaseSalary(avgBase);
            dto.setAvgBonus(avgBonus);
            dto.setAvgEquity(avgEquity);
            dto.setAvgTotalCompensation(avgTotal);
            dto.setCount(count);
            dto.setMostRecentEntry(recent);
            dto.setConfidenceTier(conf[0]);
            dto.setConfidenceLabel(conf[1]);
            return dto;
        }).collect(java.util.stream.Collectors.toList());
    }

    @Transactional(readOnly = true)
    @org.springframework.cache.annotation.Cacheable(value = "analytics", key = "'byCompanyLevel'")
    public List<com.salaryinsights.dto.response.CompanyLevelSalaryDTO> getAvgSalaryByCompanyAndLevel() {
        return mapCompanyLevelRows(salaryEntryRepository.avgSalaryByCompanyAndLevelRaw());
    }

    @Transactional(readOnly = true)
    @org.springframework.cache.annotation.Cacheable(
        value = "analytics",
        key = "'byCompanyLevel_' + T(java.util.Arrays).toString(new java.util.ArrayList(new java.util.TreeSet(#locationDisplayNames)).toArray())"
    )
    public List<com.salaryinsights.dto.response.CompanyLevelSalaryDTO> getAvgSalaryByCompanyAndLevelFiltered(
            List<String> locationDisplayNames) {
        List<String> locationEnumNames = locationDisplayNames.stream()
            .map(name -> {
                for (com.salaryinsights.enums.Location loc : com.salaryinsights.enums.Location.values()) {
                    if (loc.getDisplayName().equalsIgnoreCase(name) || loc.name().equalsIgnoreCase(name)) return loc.name();
                }
                return name;
            })
            .collect(java.util.stream.Collectors.toList());
        return mapCompanyLevelRows(salaryEntryRepository.avgSalaryByCompanyAndLevelFilteredRaw(locationEnumNames));
    }

    private List<com.salaryinsights.dto.response.CompanyLevelSalaryDTO> mapCompanyLevelRows(List<Object[]> rows) {
        return rows.stream().map(row -> {
            Long companyTotalEntries = row[10] != null ? ((Number) row[10]).longValue() : 0L;
            LocalDateTime recent     = row[11] != null ? ((java.sql.Timestamp) row[11]).toLocalDateTime() : null;
            String[] conf            = computeConfidence(companyTotalEntries, recent);
            com.salaryinsights.dto.response.CompanyLevelSalaryDTO dto = new com.salaryinsights.dto.response.CompanyLevelSalaryDTO();
            dto.setCompanyName(row[0] != null ? row[0].toString() : null);
            dto.setCompanyId(row[1] != null ? row[1].toString() : null);
            dto.setLogoUrl(row[2] != null ? row[2].toString() : null);
            dto.setWebsite(row[3] != null ? row[3].toString() : null);
            dto.setInternalLevel(row[4] != null ? row[4].toString() : null);
            dto.setAvgBaseSalary(row[5] != null ? ((Number) row[5]).doubleValue() : null);
            dto.setAvgBonus(row[6] != null ? ((Number) row[6]).doubleValue() : null);
            dto.setAvgEquity(row[7] != null ? ((Number) row[7]).doubleValue() : null);
            dto.setAvgTotalCompensation(row[8] != null ? ((Number) row[8]).doubleValue() : null);
            dto.setCount(row[9] != null ? ((Number) row[9]).longValue() : 0L);
            dto.setCompanyTotalEntries(companyTotalEntries);
            dto.setMostRecentEntry(recent);
            dto.setConfidenceTier(conf[0]);
            dto.setConfidenceLabel(conf[1]);
            return dto;
        }).collect(java.util.stream.Collectors.toList());
    }

    @Transactional(readOnly = true)
    @org.springframework.cache.annotation.Cacheable(value = "analytics", key = "'dashboard:' + #year + ':' + #month")
    public AdminDashboardResponse getAdminDashboard(Integer year, Integer month) {
        // Monthly trend — always fetched (12-month window, drives the month selector)
        List<Object[]> trends = salaryEntryRepository.submissionTrendLast12Months();
        List<java.util.Map<String, Object>> trendData = trends.stream().map(row -> {
            java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("month", row[0] != null ? row[0].toString() : "");
            m.put("count", row[1]);
            return m;
        }).collect(java.util.stream.Collectors.toList());

        // Weekly trend — only when year+month requested
        List<java.util.Map<String, Object>> weeklyData = null;
        if (year != null && month != null) {
            List<Object[]> weeks = salaryEntryRepository.submissionTrendWeeklyByMonth(year, month);
            weeklyData = new java.util.ArrayList<>();
            int weekNum = 1;
            for (Object[] row : weeks) {
                java.util.Map<String, Object> w = new java.util.LinkedHashMap<>();
                String weekStart = row[0] != null ? row[0].toString() : "";
                // Compute human-readable range: "Mar 3 – Mar 9"
                String label = "Week " + weekNum;
                try {
                    java.time.LocalDate start = java.time.LocalDate.parse(weekStart.substring(0, 10));
                    java.time.LocalDate end   = start.plusDays(6);
                    java.time.format.DateTimeFormatter fmt =
                        java.time.format.DateTimeFormatter.ofPattern("MMM d", java.util.Locale.ENGLISH);
                    label = start.format(fmt) + " – " + end.format(fmt);
                } catch (Exception ignored) {}
                w.put("weekStart", weekStart);
                w.put("weekLabel", label);
                w.put("weekNum",   weekNum);
                w.put("count",     row[2]);
                weekNum++;
            }
        }

        return AdminDashboardResponse.builder()
                .totalCompanies(companyRepository.count())
                .activeCompanies(companyRepository.countByStatus(com.salaryinsights.enums.CompanyStatus.ACTIVE))
                .pendingReviews(salaryEntryRepository.countByReviewStatus(ReviewStatus.PENDING))
                .totalSalaryEntries(salaryEntryRepository.count())
                .approvedEntries(salaryEntryRepository.countByReviewStatus(ReviewStatus.APPROVED))
                .rejectedEntries(salaryEntryRepository.countByReviewStatus(ReviewStatus.REJECTED))
                .avgBaseSalary(salaryEntryRepository.avgBaseSalaryApproved())
                .submissionTrend(trendData)
                .weeklyTrend(weeklyData)
                .build();
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public long getSubmissionsThisMonth() {
        LocalDateTime startOfMonth = LocalDateTime.now()
                .withDayOfMonth(1)
                .withHour(0).withMinute(0).withSecond(0).withNano(0);
        return salaryEntryRepository.countByCreatedAtAfterAndReviewStatus(
                startOfMonth, ReviewStatus.APPROVED);
    }

        // ──────────────────────────────────────────────────────────────
    // Admin: Approved Salaries — list, edit, delete
    // ──────────────────────────────────────────────────────────────

    /**
     * Returns a paginated list of APPROVED salary entries for the admin panel.
     * Supports filtering by company ID, company name (partial), job title (partial),
     * locations (multi), experience levels (multi), and employment type.
     *
     * Uses the same JpaSpecificationExecutor path as the public endpoint so it
     * benefits from all the composite indexes added in V26.
     *
     * Scalability notes:
     *  - Page size capped at 100 server-side to prevent runaway queries.
     *  - Specification only fetches company + standardizedLevel eagerly on data
     *    pages (not count queries), avoiding N+1 at the mapper step.
     *  - Cache is deliberately NOT applied here: admin views must always reflect
     *    live data and must not share the same cache region as public analytics.
     */
    @Transactional(readOnly = true)
    public PagedResponse<SalaryResponse> getApprovedSalariesAdmin(
            UUID companyId,
            String companyName,
            String jobTitle,
            java.util.List<String> locations,
            java.util.List<String> experienceLevelStrs,
            String employmentTypeStr,
            Pageable pageable) {

        // Normalise text filters
        final String companyNameFilter = (companyName != null && !companyName.isBlank())
                ? companyName.toLowerCase() : null;
        final String jobTitleFilter = (jobTitle != null && !jobTitle.isBlank())
                ? jobTitle.toLowerCase() : null;

        // Locations: accept display names ("Bengaluru") or enum names ("BENGALURU")
        final java.util.List<String> locationEnumNames =
                (locations != null && !locations.isEmpty())
                        ? locations.stream()
                                .map(l -> {
                                    for (com.salaryinsights.enums.Location loc
                                            : com.salaryinsights.enums.Location.values()) {
                                        if (loc.getDisplayName().equalsIgnoreCase(l)
                                                || loc.name().equalsIgnoreCase(l)) {
                                            return loc.name();
                                        }
                                    }
                                    return l;
                                })
                                .collect(java.util.stream.Collectors.toList())
                        : null;

        // Experience levels
        final java.util.List<ExperienceLevel> levelFilters =
                (experienceLevelStrs != null && !experienceLevelStrs.isEmpty())
                        ? experienceLevelStrs.stream()
                                .map(s -> {
                                    try { return ExperienceLevel.valueOf(s.toUpperCase()); }
                                    catch (IllegalArgumentException e) { return null; }
                                })
                                .filter(java.util.Objects::nonNull)
                                .collect(java.util.stream.Collectors.toList())
                        : null;

        // Employment type
        com.salaryinsights.enums.EmploymentType empTypeTmp = null;
        if (employmentTypeStr != null && !employmentTypeStr.isBlank()) {
            try {
                empTypeTmp = com.salaryinsights.enums.EmploymentType
                        .valueOf(employmentTypeStr.toUpperCase());
            } catch (IllegalArgumentException ignored) { }
        }
        final com.salaryinsights.enums.EmploymentType empTypeFilter = empTypeTmp;

        org.springframework.data.jpa.domain.Specification<SalaryEntry> spec =
                (root, query, cb) -> {
                    boolean isCount = query.getResultType() == Long.class
                            || query.getResultType() == long.class;

                    jakarta.persistence.criteria.Join<Object, Object> companyJoin =
                            root.join("company", jakarta.persistence.criteria.JoinType.LEFT);

                    if (!isCount) {
                        root.fetch("company", jakarta.persistence.criteria.JoinType.LEFT);
                        root.fetch("standardizedLevel", jakarta.persistence.criteria.JoinType.LEFT);
                        query.distinct(true);
                    }

                    java.util.List<jakarta.persistence.criteria.Predicate> predicates =
                            new java.util.ArrayList<>();
                    predicates.add(cb.equal(
                            root.get("reviewStatus"),
                            com.salaryinsights.enums.ReviewStatus.APPROVED));

                    if (companyId != null) {
                        predicates.add(cb.equal(companyJoin.get("id"), companyId));
                    }
                    if (companyNameFilter != null) {
                        predicates.add(cb.like(
                                cb.lower(companyJoin.get("name")),
                                "%" + companyNameFilter + "%"));
                    }
                    if (jobTitleFilter != null) {
                        predicates.add(cb.like(
                                cb.lower(root.get("jobTitle")),
                                "%" + jobTitleFilter + "%"));
                    }
                    if (locationEnumNames != null && !locationEnumNames.isEmpty()) {
                        predicates.add(root.get("location").in(locationEnumNames));
                    }
                    if (levelFilters != null && !levelFilters.isEmpty()) {
                        predicates.add(root.get("experienceLevel").in(levelFilters));
                    }
                    if (empTypeFilter != null) {
                        predicates.add(cb.equal(root.get("employmentType"), empTypeFilter));
                    }

                    return cb.and(predicates.toArray(
                            new jakarta.persistence.criteria.Predicate[0]));
                };

        Page<SalaryEntry> page = salaryEntryRepository.findAll(spec, pageable);
        List<SalaryResponse> mapped = page.getContent().stream()
                .map(salaryMapper::toResponse)
                .collect(java.util.stream.Collectors.toList());

        return PagedResponse.<SalaryResponse>builder()
                .content(mapped)
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .build();
    }

    /**
     * Partial update of an approved salary entry (admin only).
     * Only non-null fields in the request are applied.
     * Evicts analytics and company-list caches because editing a salary
     * can change aggregate values shown to public users.
     */
    @Transactional
    @org.springframework.cache.annotation.Caching(evict = {
        @org.springframework.cache.annotation.CacheEvict(value = "analytics",   allEntries = true),
        @org.springframework.cache.annotation.CacheEvict(value = "companyList", allEntries = true)
    })
    public SalaryResponse updateApprovedSalary(
            UUID id,
            com.salaryinsights.dto.request.AdminSalaryUpdateRequest req) {

        SalaryEntry entry = salaryEntryRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Salary entry not found: " + id));

        if (entry.getReviewStatus() != com.salaryinsights.enums.ReviewStatus.APPROVED) {
            throw new BadRequestException("Only APPROVED entries can be edited via this endpoint");
        }

        // Apply partial updates — only non-null fields
        if (req.getCompanyId() != null) {
            Company company = companyRepository.findById(req.getCompanyId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Company not found: " + req.getCompanyId()));
            entry.setCompany(company);
        }
        if (req.getJobTitle()           != null) entry.setJobTitle(req.getJobTitle());
        if (req.getDepartment()          != null) entry.setDepartment(req.getDepartment());
        if (req.getExperienceLevel()     != null) entry.setExperienceLevel(req.getExperienceLevel());
        if (req.getCompanyInternalLevel()!= null) entry.setCompanyInternalLevel(req.getCompanyInternalLevel());
        if (req.getLocation()            != null) entry.setLocation(req.getLocation());
        if (req.getYearsOfExperience()   != null) entry.setYearsOfExperience(req.getYearsOfExperience());
        if (req.getBaseSalary()          != null) entry.setBaseSalary(req.getBaseSalary());
        if (req.getBonus()               != null) entry.setBonus(req.getBonus());
        if (req.getEquity()              != null) entry.setEquity(req.getEquity());
        if (req.getEmploymentType()      != null) entry.setEmploymentType(req.getEmploymentType());

        entry = salaryEntryRepository.save(entry);

        // Refresh company TC range after salary change
        UUID companyId = entry.getCompany().getId();
        companyRepository.findById(companyId).ifPresent(c -> {
            c.setTcMin(salaryEntryRepository.minTCByCompany(companyId));
            c.setTcMax(salaryEntryRepository.maxTCByCompany(companyId));
            companyRepository.save(c);
        });

        auditLogService.log("SalaryEntry", id.toString(), "ADMIN_UPDATED",
                "Admin updated approved salary for company: " + entry.getCompany().getName());

        return salaryMapper.toResponse(entry);
    }

    /**
     * Hard-deletes an approved salary entry (admin only).
     * Evicts all analytics caches — the deleted row affected aggregates.
     */
    @Transactional
    @org.springframework.cache.annotation.Caching(evict = {
        @org.springframework.cache.annotation.CacheEvict(value = "analytics",   allEntries = true),
        @org.springframework.cache.annotation.CacheEvict(value = "companyList", allEntries = true)
    })
    public void deleteApprovedSalary(UUID id) {
        SalaryEntry entry = salaryEntryRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Salary entry not found: " + id));

        if (entry.getReviewStatus() != com.salaryinsights.enums.ReviewStatus.APPROVED) {
            throw new BadRequestException("Only APPROVED entries can be deleted via this endpoint");
        }

        UUID companyId = entry.getCompany() != null ? entry.getCompany().getId() : null;
        String companyName = entry.getCompany() != null ? entry.getCompany().getName() : "unknown";

        auditLogService.log("SalaryEntry", id.toString(), "ADMIN_DELETED",
                "Admin deleted approved salary for company: " + companyName);

        salaryEntryRepository.deleteById(id);

        // Refresh company TC range after deletion
        if (companyId != null) {
            companyRepository.findById(companyId).ifPresent(c -> {
                c.setTcMin(salaryEntryRepository.minTCByCompany(companyId));
                c.setTcMax(salaryEntryRepository.maxTCByCompany(companyId));
                companyRepository.save(c);
            });
        }
    }


    // ── Feature 1: Salary Benchmarker ────────────────────────────────────────
    /**
     * Returns percentile stats (p25/p50/p75 + avg) for TC and base salary
     * matching the given role keyword + experience level + optional location.
     * If the exact-match sample size is < 5, location is dropped (broadened search).
     * If still < 5, experienceLevel is also dropped.
     * Benchmark results are NOT cached — they are parameterised per-user input
     * and would create unbounded cache entries. The query uses a partial index
     * on (review_status, experience_level, location) which keeps it fast.
     */
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public com.salaryinsights.dto.response.BenchmarkResponse getBenchmark(
            String jobTitle, String expLevel, String location) {

        // Normalise expLevel: map frontend values (ENTRY/MID/SENIOR/LEAD) to DB enum names
        String normExpLevel = expLevel != null && !expLevel.isBlank() ? expLevel.toUpperCase() : null;

        // Normalise location: display name → enum name
        String normLocation = null;
        if (location != null && !location.isBlank()) {
            for (com.salaryinsights.enums.Location loc : com.salaryinsights.enums.Location.values()) {
                if (loc.getDisplayName().equalsIgnoreCase(location) || loc.name().equalsIgnoreCase(location)) {
                    normLocation = loc.name();
                    break;
                }
            }
            if (normLocation == null) normLocation = location.toUpperCase();
        }

        String normTitle = (jobTitle != null && !jobTitle.isBlank()) ? jobTitle.trim() : null;

        // Attempt exact match
        java.util.List<Object[]> rows = salaryEntryRepository.benchmarkRaw(normTitle, normExpLevel, normLocation);
        Object[] row = (rows != null && !rows.isEmpty()) ? rows.get(0) : null;
        long count = row != null && row[9] != null ? ((Number) row[9]).longValue() : 0L;
        boolean broadened = false;
        String broadeningReason = null;

        // Broaden 1: drop location
        if (count < 5 && normLocation != null) {
            rows = salaryEntryRepository.benchmarkRaw(normTitle, normExpLevel, null);
            row = (rows != null && !rows.isEmpty()) ? rows.get(0) : null;
            count = row != null && row[9] != null ? ((Number) row[9]).longValue() : 0L;
            broadened = true;
            broadeningReason = "Location filter removed to expand sample";
        }

        // Broaden 2: drop experience level too
        if (count < 5 && normExpLevel != null) {
            rows = salaryEntryRepository.benchmarkRaw(normTitle, null, null);
            row = (rows != null && !rows.isEmpty()) ? rows.get(0) : null;
            count = row != null && row[9] != null ? ((Number) row[9]).longValue() : 0L;
            broadeningReason = "Location and level filters removed to expand sample";
        }

        if (row == null || count == 0) {
            return com.salaryinsights.dto.response.BenchmarkResponse.builder()
                    .role(normTitle)
                    .experienceLevel(normExpLevel)
                    .location(normLocation)
                    .sampleSize(0)
                    .broadened(true)
                    .broadeningReason("No matching salary data found")
                    .build();
        }

        return com.salaryinsights.dto.response.BenchmarkResponse.builder()
                .role(normTitle)
                .experienceLevel(normExpLevel)
                .location(normLocation)
                .sampleSize(count)
                .p25Tc(row[0] != null ? new java.math.BigDecimal(row[0].toString()) : null)
                .p50Tc(row[1] != null ? new java.math.BigDecimal(row[1].toString()) : null)
                .p75Tc(row[2] != null ? new java.math.BigDecimal(row[2].toString()) : null)
                .avgTc(row[3] != null ? new java.math.BigDecimal(row[3].toString()) : null)
                .p25Base(row[4] != null ? new java.math.BigDecimal(row[4].toString()) : null)
                .p50Base(row[5] != null ? new java.math.BigDecimal(row[5].toString()) : null)
                .avgBase(row[6] != null ? new java.math.BigDecimal(row[6].toString()) : null)
                .avgBonus(row[7] != null ? new java.math.BigDecimal(row[7].toString()) : null)
                .avgEquity(row[8] != null ? new java.math.BigDecimal(row[8].toString()) : null)
                .broadened(broadened)
                .broadeningReason(broadeningReason)
                .build();
    }

    // ── Feature 2: Salary Trends ──────────────────────────────────────────────
    /**
     * Returns recent (0-6 months) vs prior (6-12 months) avg TC per company.
     * Used to render ↑ ↓ → trend arrows on salary rows.
     * Cached on "analytics" (1h TTL) — same eviction points as other analytics.
     */
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    @org.springframework.cache.annotation.Cacheable(value = "analytics", key = "'salaryTrends'")
    public java.util.List<com.salaryinsights.dto.response.CompanyTrendDTO> getSalaryTrends() {
        return salaryEntryRepository.salaryTrendsRaw().stream().map(row -> {
            String companyIdStr = row[0] != null ? row[0].toString() : null;
            java.util.UUID companyId = null;
            try { if (companyIdStr != null) companyId = java.util.UUID.fromString(companyIdStr); }
            catch (IllegalArgumentException ignored) {}
            String companyName   = row[1] != null ? row[1].toString() : null;
            java.math.BigDecimal recentAvg = row[2] != null ? new java.math.BigDecimal(row[2].toString()) : null;
            java.math.BigDecimal priorAvg  = row[3] != null ? new java.math.BigDecimal(row[3].toString()) : null;
            long recentCount = row[4] != null ? ((Number) row[4]).longValue() : 0L;
            long priorCount  = row[5] != null ? ((Number) row[5]).longValue() : 0L;
            return new com.salaryinsights.dto.response.CompanyTrendDTO(
                    companyId, companyName, recentAvg, priorAvg, recentCount, priorCount);
        }).collect(java.util.stream.Collectors.toList());
    }

    // ── Feature 3: Hiring Now ─────────────────────────────────────────────────
    /**
     * Returns companyId → open role count for all companies with ≥1 LIVE opportunity.
     * Cached on "companyList" (5-min TTL) — evicted on any opportunity approval/change.
     */
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    @org.springframework.cache.annotation.Cacheable(value = "companyList", key = "'hiringNow'")
    public java.util.List<com.salaryinsights.dto.response.CompanyHiringDTO> getHiringNow() {
        return opportunityRepository.companyOpenRoleCountsRaw().stream().map(row -> {
            String idStr = row[0] != null ? row[0].toString() : null;
            java.util.UUID companyId = null;
            try { if (idStr != null) companyId = java.util.UUID.fromString(idStr); }
            catch (IllegalArgumentException ignored) {}
            long openRoles = row[1] != null ? ((Number) row[1]).longValue() : 0L;
            return new com.salaryinsights.dto.response.CompanyHiringDTO(companyId, openRoles);
        }).collect(java.util.stream.Collectors.toList());
    }

}
