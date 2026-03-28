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
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SalaryService {

    private final SalaryEntryRepository    salaryEntryRepository;
    private final CompanyRepository        companyRepository;
    private final UserRepository           userRepository;
    private final SalaryMapper             salaryMapper;
    private final AuditLogService          auditLogService;
    private final JobFunctionRepository    jobFunctionRepository;
    private final FunctionLevelRepository  functionLevelRepository;
    private final StandardizedLevelRepository standardizedLevelRepository;
    private final com.salaryinsights.repository.OpportunityRepository opportunityRepository;

    @Transactional(readOnly = true)
    public PagedResponse<SalaryResponse> getMySubmissions(Pageable pageable) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Page<SalaryEntry> page = salaryEntryRepository.findBySubmittedByEmail(email, pageable);
        List<SalaryResponse> content = page.getContent().stream()
                .map(salaryMapper::toResponse)
                .collect(Collectors.toList());
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
            List<String> locations, List<String> experienceLevelStrs,
            Pageable pageable) {
        return getApprovedSalaries(companyId, companyName, jobTitle, locations, experienceLevelStrs, null, null, null, null, pageable);
    }

    @Transactional(readOnly = true)
    public PagedResponse<SalaryResponse> getApprovedSalaries(
            UUID companyId, String companyName, String jobTitle,
            List<String> locations, List<String> experienceLevelStrs,
            List<String> internalLevelStrs,
            Pageable pageable) {
        return getApprovedSalaries(companyId, companyName, jobTitle, locations, experienceLevelStrs, internalLevelStrs, null, null, null, pageable);
    }

    @Transactional(readOnly = true)
    public PagedResponse<SalaryResponse> getApprovedSalaries(
            UUID companyId, String companyName, String jobTitle,
            List<String> locations, List<String> experienceLevelStrs,
            String employmentTypeStr,
            Pageable pageable) {
        return getApprovedSalaries(companyId, companyName, jobTitle, locations, experienceLevelStrs, null, employmentTypeStr, null, null, pageable);
    }

    @Transactional(readOnly = true)
    public PagedResponse<SalaryResponse> getApprovedSalaries(
            UUID companyId, String companyName, String jobTitle,
            List<String> locations, List<String> experienceLevelStrs,
            String employmentTypeStr,
            UUID jobFunctionId, UUID functionLevelId,
            Pageable pageable) {
        return getApprovedSalaries(companyId, companyName, jobTitle, locations, experienceLevelStrs,
                null, employmentTypeStr, jobFunctionId, functionLevelId, pageable);
    }

    @Transactional(readOnly = true)
    public PagedResponse<SalaryResponse> getApprovedSalaries(
            UUID companyId, String companyName, String jobTitle,
            List<String> locations, List<String> experienceLevelStrs,
            List<String> internalLevelStrs,
            String employmentTypeStr,
            UUID jobFunctionId, UUID functionLevelId,
            Pageable pageable) {

        final String companyNameFilter = (companyName != null && !companyName.isBlank()) ? companyName.toLowerCase() : null;
        final String jobTitleFilter    = (jobTitle    != null && !jobTitle.isBlank())    ? jobTitle.toLowerCase()    : null;
        final UUID   companyIdFilter   = companyId;

        // Convert display names ("Bengaluru") or enum names ("BENGALURU") → DB enum names
        final List<String> locationEnumNames = (locations != null && !locations.isEmpty())
            ? locations.stream()
                .map(l -> {
                    for (com.salaryinsights.enums.Location loc : com.salaryinsights.enums.Location.values()) {
                        if (loc.getDisplayName().equalsIgnoreCase(l) || loc.name().equalsIgnoreCase(l)) return loc.name();
                    }
                    return l;
                })
                .collect(Collectors.toList())
            : null;

        // Convert raw strings → ExperienceLevel enums, silently skipping unknowns
        final List<ExperienceLevel> levelFilters = (experienceLevelStrs != null && !experienceLevelStrs.isEmpty())
            ? experienceLevelStrs.stream()
                .map(s -> { try { return ExperienceLevel.valueOf(s.toUpperCase()); } catch (IllegalArgumentException e) { return null; } })
                .filter(Objects::nonNull)
                .collect(Collectors.toList())
            : null;

        // Resolve internalLevel filter strings → standardized_level UUIDs (DB-driven, no enum)
        final List<UUID> stdLevelIds = (internalLevelStrs != null && !internalLevelStrs.isEmpty())
            ? internalLevelStrs.stream()
                .map(s -> standardizedLevelRepository.findByNameIgnoreCase(s)
                        .map(StandardizedLevel::getId).orElse(null))
                .filter(Objects::nonNull)
                .collect(Collectors.toList())
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

                List<jakarta.persistence.criteria.Predicate> predicates = new java.util.ArrayList<>();
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
                if (locationEnumNames != null && !locationEnumNames.isEmpty()) {
                    predicates.add(root.get("location").in(locationEnumNames));
                }
                if (levelFilters != null && !levelFilters.isEmpty()) {
                    predicates.add(root.get("experienceLevel").in(levelFilters));
                }
                // Filter by standardized level FK — replaces the old companyInternalLevel enum predicate
                if (stdLevelIds != null && !stdLevelIds.isEmpty()) {
                    predicates.add(root.get("standardizedLevel").get("id").in(stdLevelIds));
                }
                if (employmentTypeFilter != null) {
                    predicates.add(cb.equal(root.get("employmentType"), employmentTypeFilter));
                }
                if (jobFunctionId != null) {
                    predicates.add(cb.equal(root.get("jobFunction").get("id"), jobFunctionId));
                }
                if (functionLevelId != null) {
                    predicates.add(cb.equal(root.get("functionLevel").get("id"), functionLevelId));
                }

                return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
            };

        Page<SalaryEntry> page = salaryEntryRepository.findAll(spec, pageable);
        List<SalaryResponse> mapped = page.getContent().stream()
                .map(salaryMapper::toResponse)
                .collect(Collectors.toList());
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
        List<SalaryResponse> mapped = page.getContent().stream()
                .map(entry -> {
                    try {
                        return salaryMapper.toResponse(entry);
                    } catch (Exception e) {
                        log.error("Failed to map SalaryEntry id={}: {}", entry.getId(), e.getMessage(), e);
                        throw e;
                    }
                })
                .collect(Collectors.toList());
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
    /**
     * Overload for background/system threads that have no HTTP security context.
     * Callers (e.g. AiSalaryEnrichmentService) supply the submitter User directly.
     */
    public SalaryResponse submitSalary(SalaryRequest request, User submitter) {
        return submitSalaryInternal(request, submitter);
    }

    public SalaryResponse submitSalary(SalaryRequest request) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User submitter = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return submitSalaryInternal(request, submitter);
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "analytics", allEntries = true)
    private SalaryResponse submitSalaryInternal(SalaryRequest request, User submitter) {
        Company company;
        if (request.getCompanyId() != null) {
            company = companyRepository.findById(request.getCompanyId())
                    .orElseThrow(() -> new ResourceNotFoundException("Company not found: " + request.getCompanyId()));
        } else if (request.getCompanyName() != null && !request.getCompanyName().isBlank()) {
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
            throw new BadRequestException("Either companyId or companyName must be provided");
        }

        SalaryEntry entry = salaryMapper.toEntity(request);
        entry.setCompany(company);
        entry.setSubmittedBy(submitter);

        final SalaryEntry entryRef = entry;

        if (request.getJobFunctionId() != null) {
            jobFunctionRepository.findById(request.getJobFunctionId())
                    .ifPresent(entryRef::setJobFunction);
        }

        if (request.getFunctionLevelId() != null) {
            functionLevelRepository.findById(request.getFunctionLevelId())
                    .ifPresent(fl -> {
                        entryRef.setFunctionLevel(fl);
                        // Propagate the standardized level from the function level mapping.
                        // This is the DB-driven replacement for the old InternalLevel enum copy.
                        if (fl.getStandardizedLevel() != null) {
                            entryRef.setStandardizedLevel(fl.getStandardizedLevel());
                        }
                    });
        }

        // Auto-derive experienceLevel when not provided — DB column is NOT NULL
        if (entry.getExperienceLevel() == null) {
            entry.setExperienceLevel(deriveExperienceLevel(request, entry.getStandardizedLevel()));
        }

        entry.setReviewStatus(ReviewStatus.PENDING);

        // Persist source metadata set by AI enrichment (or User for manual submissions)
        if (request.getDataSource() != null && !request.getDataSource().isBlank()) {
            entry.setDataSource(request.getDataSource());
        } else if (submitter != null) {
            // Manual user submission — record actual email domain or "User"
            entry.setDataSource("User");
        }
        if (request.getEquityTotalGrant() != null) {
            entry.setEquityTotalGrant(request.getEquityTotalGrant());
        }

        // Persist AI dedup fingerprint when set (null for manual user submissions)
        if (request.getAiFingerprint() != null && !request.getAiFingerprint().isBlank()) {
            entry.setAiFingerprint(request.getAiFingerprint());
        }

        entry = salaryEntryRepository.save(entry);
        log.info("Salary SAVED — id={}, reviewStatus={}, company={}, submittedBy={}",
                entry.getId(), entry.getReviewStatus(), company.getName(),
                submitter != null ? submitter.getEmail() : "system");
        auditLogService.log("SalaryEntry", entry.getId().toString(), "SUBMITTED",
                "Submitted salary for " + company.getName());

        return salaryMapper.toResponse(entry);
    }

    /**
     * Derives ExperienceLevel from yearsOfExperience, then falls back to the
     * standardized level's explicit experienceLevel field (DB-driven — no rank ladder).
     */
    private ExperienceLevel deriveExperienceLevel(SalaryRequest request, StandardizedLevel resolvedLevel) {
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
        if (resolvedLevel != null && resolvedLevel.getExperienceLevel() != null) {
            return resolvedLevel.getExperienceLevel();
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

        if (status == ReviewStatus.APPROVED && entry.getCompany() != null) {
            UUID companyId = entry.getCompany().getId();
            companyRepository.findById(companyId).ifPresent(company -> {
                company.setTcMin(salaryEntryRepository.minTCByCompany(companyId));
                company.setTcMax(salaryEntryRepository.maxTCByCompany(companyId));
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
    public List<YoeSalaryDTO> getAvgSalaryByYoe() {
        return salaryEntryRepository.avgSalaryByYoeRaw().stream().map(row -> {
            Integer yoe    = row[0] != null ? ((Number) row[0]).intValue()    : null;
            Double  base   = row[1] != null ? ((Number) row[1]).doubleValue() : null;
            Double  bonus  = row[2] != null ? ((Number) row[2]).doubleValue() : null;
            Double  equity = row[3] != null ? ((Number) row[3]).doubleValue() : null;
            Double  total  = row[4] != null ? ((Number) row[4]).doubleValue() : null;
            Long    count  = row[5] != null ? ((Number) row[5]).longValue()   : 0L;
            return new YoeSalaryDTO(yoe, base, bonus, equity, total, count);
        }).collect(Collectors.toList());
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
            SalaryAggregationDTO dto = new SalaryAggregationDTO();
            dto.setGroupKey(displayName);
            dto.setAvgBaseSalary(row[1] != null ? ((Number) row[1]).doubleValue() : null);
            dto.setAvgBonus(row[2] != null ? ((Number) row[2]).doubleValue() : null);
            dto.setAvgEquity(row[3] != null ? ((Number) row[3]).doubleValue() : null);
            dto.setAvgTotalCompensation(row[4] != null ? ((Number) row[4]).doubleValue() : null);
            dto.setCount(row[5] != null ? ((Number) row[5]).longValue() : 0L);
            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    @org.springframework.cache.annotation.Cacheable(value = "analytics", key = "'byLocationLevel'")
    public List<LocationLevelSalaryDTO> getAvgSalaryByLocationAndLevel() {
        return salaryEntryRepository.avgSalaryByLocationAndLevelRaw().stream().map(row -> {
            // col: location[0], levelName[1], avgBaseSalary[2], avgBonus[3], avgEquity[4], avgTotalComp[5], cnt[6]
            String enumName = row[0] != null ? row[0].toString() : null;
            String displayName = enumName;
            if (enumName != null) {
                try {
                    com.salaryinsights.enums.Location loc = com.salaryinsights.enums.Location.valueOf(enumName);
                    displayName = loc.getDisplayName();
                } catch (IllegalArgumentException ignored) {}
            }
            LocationLevelSalaryDTO dto = new LocationLevelSalaryDTO();
            dto.setLocation(displayName);
            dto.setInternalLevel(row[1] != null ? row[1].toString() : null);
            dto.setAvgBaseSalary(row[2] != null ? ((Number) row[2]).doubleValue() : null);
            dto.setAvgBonus(row[3] != null ? ((Number) row[3]).doubleValue() : null);
            dto.setAvgEquity(row[4] != null ? ((Number) row[4]).doubleValue() : null);
            dto.setAvgTotalCompensation(row[5] != null ? ((Number) row[5]).doubleValue() : null);
            dto.setCount(row[6] != null ? ((Number) row[6]).longValue() : 0L);
            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SalaryAggregationDTO> getAvgSalaryByInternalLevel(List<String> locationDisplayNames) {
        List<String> locationEnumNames = null;
        if (locationDisplayNames != null && !locationDisplayNames.isEmpty()) {
            locationEnumNames = locationDisplayNames.stream()
                .map(name -> {
                    for (com.salaryinsights.enums.Location loc : com.salaryinsights.enums.Location.values()) {
                        if (loc.getDisplayName().equalsIgnoreCase(name) || loc.name().equalsIgnoreCase(name)) {
                            return loc.name();
                        }
                    }
                    return name;
                })
                .collect(Collectors.toList());
        }

        List<Object[]> rows = (locationEnumNames == null || locationEnumNames.isEmpty())
            ? salaryEntryRepository.avgSalaryByInternalLevelRaw()
            : salaryEntryRepository.avgSalaryByInternalLevelFilteredRaw(locationEnumNames);

        return rows.stream().map(row -> {
            SalaryAggregationDTO dto = new SalaryAggregationDTO();
            dto.setGroupKey(row[0] != null ? row[0].toString() : null);
            dto.setAvgBaseSalary(row[1] != null ? ((Number) row[1]).doubleValue() : null);
            dto.setAvgBonus(row[2] != null ? ((Number) row[2]).doubleValue() : null);
            dto.setAvgEquity(row[3] != null ? ((Number) row[3]).doubleValue() : null);
            dto.setAvgTotalCompensation(row[4] != null ? ((Number) row[4]).doubleValue() : null);
            dto.setCount(row[5] != null ? ((Number) row[5]).longValue() : 0L);
            return dto;
        }).collect(Collectors.toList());
    }

    private String[] computeConfidence(long count, LocalDateTime mostRecent) {
        if (count < 2) {
            return new String[]{"INSUFFICIENT", "Insufficient data · " + count + " entr" + (count == 1 ? "y" : "ies")};
        }
        double monthsAgo = mostRecent != null
            ? ChronoUnit.DAYS.between(mostRecent, LocalDateTime.now()) / 30.0
            : 24.0;
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
            Long          count  = row[8] != null ? ((Number) row[8]).longValue()   : 0L;
            LocalDateTime recent = row[9] != null ? ((java.sql.Timestamp) row[9]).toLocalDateTime() : null;
            String[]      conf   = computeConfidence(count, recent);
            SalaryAggregationDTO dto = new SalaryAggregationDTO();
            dto.setGroupKey(row[0] != null ? row[0].toString() : null);
            dto.setCompanyId(row[1] != null ? row[1].toString() : null);
            dto.setLogoUrl(row[2] != null ? row[2].toString() : null);
            dto.setWebsite(row[3] != null ? row[3].toString() : null);
            dto.setAvgBaseSalary(row[4] != null ? ((Number) row[4]).doubleValue() : null);
            dto.setAvgBonus(row[5] != null ? ((Number) row[5]).doubleValue() : null);
            dto.setAvgEquity(row[6] != null ? ((Number) row[6]).doubleValue() : null);
            dto.setAvgTotalCompensation(row[7] != null ? ((Number) row[7]).doubleValue() : null);
            dto.setCount(count);
            dto.setMostRecentEntry(recent);
            dto.setConfidenceTier(conf[0]);
            dto.setConfidenceLabel(conf[1]);
            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    @org.springframework.cache.annotation.Cacheable(value = "analytics", key = "'byCompanyLevel'")
    public List<CompanyLevelSalaryDTO> getAvgSalaryByCompanyAndLevel() {
        return mapCompanyLevelRows(salaryEntryRepository.avgSalaryByCompanyAndLevelRaw());
    }

    @Transactional(readOnly = true)
    @org.springframework.cache.annotation.Cacheable(
        value = "analytics",
        key = "'byCompanyLevel_' + T(java.util.Arrays).toString(new java.util.ArrayList(new java.util.TreeSet(#locationDisplayNames)).toArray())"
    )
    public List<CompanyLevelSalaryDTO> getAvgSalaryByCompanyAndLevelFiltered(List<String> locationDisplayNames) {
        List<String> locationEnumNames = locationDisplayNames.stream()
            .map(name -> {
                for (com.salaryinsights.enums.Location loc : com.salaryinsights.enums.Location.values()) {
                    if (loc.getDisplayName().equalsIgnoreCase(name) || loc.name().equalsIgnoreCase(name)) return loc.name();
                }
                return name;
            })
            .collect(Collectors.toList());
        return mapCompanyLevelRows(salaryEntryRepository.avgSalaryByCompanyAndLevelFilteredRaw(locationEnumNames));
    }

    private List<CompanyLevelSalaryDTO> mapCompanyLevelRows(List<Object[]> rows) {
        return rows.stream().map(row -> {
            Long          companyTotalEntries = row[10] != null ? ((Number) row[10]).longValue() : 0L;
            LocalDateTime recent             = row[11] != null ? ((java.sql.Timestamp) row[11]).toLocalDateTime() : null;
            String[]      conf               = computeConfidence(companyTotalEntries, recent);
            CompanyLevelSalaryDTO dto = new CompanyLevelSalaryDTO();
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
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    @org.springframework.cache.annotation.Cacheable(value = "analytics", key = "'dashboard:' + #year + ':' + #month")
    public AdminDashboardResponse getAdminDashboard(Integer year, Integer month) {
        List<Object[]> trends = salaryEntryRepository.submissionTrendLast12Months();
        List<java.util.Map<String, Object>> trendData = trends.stream().map(row -> {
            java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("month", row[0] != null ? row[0].toString() : "");
            m.put("count", row[1]);
            return m;
        }).collect(Collectors.toList());

        List<java.util.Map<String, Object>> weeklyData = null;
        if (year != null && month != null) {
            List<Object[]> weeks = salaryEntryRepository.submissionTrendWeeklyByMonth(year, month);
            weeklyData = new java.util.ArrayList<>();
            int weekNum = 1;
            for (Object[] row : weeks) {
                java.util.Map<String, Object> w = new java.util.LinkedHashMap<>();
                String weekStart = row[0] != null ? row[0].toString() : "";
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

        // Top 5 companies by approved submission count
        List<java.util.Map<String, Object>> topCompanies = salaryEntryRepository
                .topCompaniesBySubmissions(5)
                .stream()
                .map(row -> {
                    java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
                    m.put("name",  row[0] != null ? row[0].toString() : "");
                    m.put("count", row[1]);
                    return m;
                })
                .collect(Collectors.toList());

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
                .topCompanies(topCompanies)
                .build();
    }

    @Transactional(readOnly = true)
    public long getSubmissionsThisMonth() {
        LocalDateTime startOfMonth = LocalDateTime.now()
                .withDayOfMonth(1)
                .withHour(0).withMinute(0).withSecond(0).withNano(0);
        return salaryEntryRepository.countByCreatedAtAfterAndReviewStatus(startOfMonth, ReviewStatus.APPROVED);
    }

    @Transactional(readOnly = true)
    public long getSubmissionsLastMonth() {
        LocalDateTime startThisMonth = LocalDateTime.now()
                .withDayOfMonth(1)
                .withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime startLastMonth = startThisMonth.minusMonths(1);
        return salaryEntryRepository.countByCreatedAtBetweenAndReviewStatus(
                startLastMonth, startThisMonth, ReviewStatus.APPROVED);
    }

    @Transactional(readOnly = true)
    public PagedResponse<SalaryResponse> getApprovedSalariesAdmin(
            UUID companyId, String companyName, String jobTitle,
            List<String> locations, List<String> experienceLevelStrs,
            String employmentTypeStr, Pageable pageable) {

        final String companyNameFilter = (companyName != null && !companyName.isBlank()) ? companyName.toLowerCase() : null;
        final String jobTitleFilter    = (jobTitle    != null && !jobTitle.isBlank())    ? jobTitle.toLowerCase()    : null;

        final List<String> locationEnumNames = (locations != null && !locations.isEmpty())
                ? locations.stream()
                        .map(l -> {
                            for (com.salaryinsights.enums.Location loc : com.salaryinsights.enums.Location.values()) {
                                if (loc.getDisplayName().equalsIgnoreCase(l) || loc.name().equalsIgnoreCase(l)) return loc.name();
                            }
                            return l;
                        })
                        .collect(Collectors.toList())
                : null;

        final List<ExperienceLevel> levelFilters = (experienceLevelStrs != null && !experienceLevelStrs.isEmpty())
                ? experienceLevelStrs.stream()
                        .map(s -> { try { return ExperienceLevel.valueOf(s.toUpperCase()); } catch (IllegalArgumentException e) { return null; } })
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList())
                : null;

        com.salaryinsights.enums.EmploymentType empTypeTmp = null;
        if (employmentTypeStr != null && !employmentTypeStr.isBlank()) {
            try { empTypeTmp = com.salaryinsights.enums.EmploymentType.valueOf(employmentTypeStr.toUpperCase()); }
            catch (IllegalArgumentException ignored) { }
        }
        final com.salaryinsights.enums.EmploymentType empTypeFilter = empTypeTmp;

        org.springframework.data.jpa.domain.Specification<SalaryEntry> spec =
                (root, query, cb) -> {
                    boolean isCount = query.getResultType() == Long.class || query.getResultType() == long.class;

                    jakarta.persistence.criteria.Join<Object, Object> companyJoin =
                            root.join("company", jakarta.persistence.criteria.JoinType.LEFT);

                    if (!isCount) {
                        root.fetch("company", jakarta.persistence.criteria.JoinType.LEFT);
                        root.fetch("standardizedLevel", jakarta.persistence.criteria.JoinType.LEFT);
                        query.distinct(true);
                    }

                    List<jakarta.persistence.criteria.Predicate> predicates = new java.util.ArrayList<>();
                    predicates.add(cb.equal(root.get("reviewStatus"), com.salaryinsights.enums.ReviewStatus.APPROVED));

                    if (companyId != null)        predicates.add(cb.equal(companyJoin.get("id"), companyId));
                    if (companyNameFilter != null) predicates.add(cb.like(cb.lower(companyJoin.get("name")), "%" + companyNameFilter + "%"));
                    if (jobTitleFilter != null)    predicates.add(cb.like(cb.lower(root.get("jobTitle")), "%" + jobTitleFilter + "%"));
                    if (locationEnumNames != null && !locationEnumNames.isEmpty()) predicates.add(root.get("location").in(locationEnumNames));
                    if (levelFilters != null && !levelFilters.isEmpty())           predicates.add(root.get("experienceLevel").in(levelFilters));
                    if (empTypeFilter != null)     predicates.add(cb.equal(root.get("employmentType"), empTypeFilter));

                    return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
                };

        Page<SalaryEntry> page = salaryEntryRepository.findAll(spec, pageable);
        List<SalaryResponse> mapped = page.getContent().stream().map(salaryMapper::toResponse).collect(Collectors.toList());

        return PagedResponse.<SalaryResponse>builder()
                .content(mapped).page(page.getNumber()).size(page.getSize())
                .totalElements(page.getTotalElements()).totalPages(page.getTotalPages()).last(page.isLast())
                .build();
    }

    @Transactional
    @org.springframework.cache.annotation.Caching(evict = {
        @org.springframework.cache.annotation.CacheEvict(value = "analytics",   allEntries = true),
        @org.springframework.cache.annotation.CacheEvict(value = "companyList", allEntries = true)
    })
    public SalaryResponse updateApprovedSalary(UUID id, com.salaryinsights.dto.request.AdminSalaryUpdateRequest req) {

        SalaryEntry entry = salaryEntryRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Salary entry not found: " + id));

        if (entry.getReviewStatus() != com.salaryinsights.enums.ReviewStatus.APPROVED) {
            throw new BadRequestException("Only APPROVED entries can be edited via this endpoint");
        }

        if (req.getCompanyId()        != null) {
            Company company = companyRepository.findById(req.getCompanyId())
                    .orElseThrow(() -> new ResourceNotFoundException("Company not found: " + req.getCompanyId()));
            entry.setCompany(company);
        }
        if (req.getJobTitle()          != null) entry.setJobTitle(req.getJobTitle());
        if (req.getDepartment()         != null) entry.setDepartment(req.getDepartment());
        if (req.getExperienceLevel()    != null) entry.setExperienceLevel(req.getExperienceLevel());
        if (req.getLocation()           != null) entry.setLocation(req.getLocation());
        if (req.getYearsOfExperience()  != null) entry.setYearsOfExperience(req.getYearsOfExperience());
        if (req.getBaseSalary()         != null) entry.setBaseSalary(req.getBaseSalary());
        if (req.getBonus()              != null) entry.setBonus(req.getBonus());
        if (req.getEquity()             != null) entry.setEquity(req.getEquity());
        if (req.getEmploymentType()     != null) entry.setEmploymentType(req.getEmploymentType());
        // Reassign standardized level if provided by admin
        if (req.getStandardizedLevelId() != null) {
            standardizedLevelRepository.findById(req.getStandardizedLevelId())
                    .ifPresent(entry::setStandardizedLevel);
        }

        entry = salaryEntryRepository.save(entry);

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

        if (companyId != null) {
            companyRepository.findById(companyId).ifPresent(c -> {
                c.setTcMin(salaryEntryRepository.minTCByCompany(companyId));
                c.setTcMax(salaryEntryRepository.maxTCByCompany(companyId));
                companyRepository.save(c);
            });
        }
    }

    @Transactional(readOnly = true)
    public com.salaryinsights.dto.response.BenchmarkResponse getBenchmark(
            String jobTitle, String jobFunctionId, String functionLevelId, String location) {

        String jobFunctionDisplay  = null;
        String functionLevelDisplay = null;

        if (jobFunctionId != null && !jobFunctionId.isBlank()) {
            try { jobFunctionDisplay = jobFunctionRepository.findById(UUID.fromString(jobFunctionId))
                    .map(f -> f.getDisplayName()).orElse(null);
            } catch (IllegalArgumentException ignored) {}
        }
        if (functionLevelId != null && !functionLevelId.isBlank()) {
            try { functionLevelDisplay = functionLevelRepository.findById(UUID.fromString(functionLevelId))
                    .map(l -> l.getName()).orElse(null);
            } catch (IllegalArgumentException ignored) {}
        }

        String normLocation = null;
        if (location != null && !location.isBlank()) {
            for (com.salaryinsights.enums.Location loc : com.salaryinsights.enums.Location.values()) {
                if (loc.getDisplayName().equalsIgnoreCase(location) || loc.name().equalsIgnoreCase(location)) {
                    normLocation = loc.name(); break;
                }
            }
            if (normLocation == null) normLocation = location.toUpperCase();
        }

        String normTitle      = (jobTitle      != null && !jobTitle.isBlank())      ? jobTitle.trim()      : null;
        String normFunctionId = (jobFunctionId  != null && !jobFunctionId.isBlank()) ? jobFunctionId.trim() : null;
        String normLevelId    = (functionLevelId != null && !functionLevelId.isBlank()) ? functionLevelId.trim() : null;

        List<Object[]> rows = salaryEntryRepository.benchmarkRaw(normTitle, normFunctionId, normLevelId, normLocation);
        Object[] row = (rows != null && !rows.isEmpty()) ? rows.get(0) : null;
        long count = row != null && row[10] != null ? ((Number) row[10]).longValue() : 0L;
        boolean broadened = false;
        String broadeningReason = null;

        if (count < 5 && normLevelId != null) {
            rows = salaryEntryRepository.benchmarkRaw(normTitle, normFunctionId, null, normLocation);
            row = (rows != null && !rows.isEmpty()) ? rows.get(0) : null;
            count = row != null && row[10] != null ? ((Number) row[10]).longValue() : 0L;
            broadened = true; broadeningReason = "Level filter removed to expand sample";
        }
        if (count < 5 && normLocation != null) {
            rows = salaryEntryRepository.benchmarkRaw(normTitle, normFunctionId, null, null);
            row = (rows != null && !rows.isEmpty()) ? rows.get(0) : null;
            count = row != null && row[10] != null ? ((Number) row[10]).longValue() : 0L;
            broadeningReason = "Level and location filters removed to expand sample";
        }
        if (count < 5 && normFunctionId != null) {
            rows = salaryEntryRepository.benchmarkRaw(normTitle, null, null, null);
            row = (rows != null && !rows.isEmpty()) ? rows.get(0) : null;
            count = row != null && row[10] != null ? ((Number) row[10]).longValue() : 0L;
            broadeningReason = "All filters removed — matching on job title only";
        }

        if (row == null || count == 0) {
            return com.salaryinsights.dto.response.BenchmarkResponse.builder()
                    .role(normTitle).jobFunction(jobFunctionDisplay).level(functionLevelDisplay)
                    .location(normLocation).sampleSize(0).broadened(true)
                    .broadeningReason("No matching salary data found").build();
        }

        return com.salaryinsights.dto.response.BenchmarkResponse.builder()
                .role(normTitle).jobFunction(jobFunctionDisplay).level(functionLevelDisplay)
                .location(normLocation).sampleSize(count)
                .p25Tc(row[0]  != null ? new java.math.BigDecimal(row[0].toString())  : null)
                .p50Tc(row[1]  != null ? new java.math.BigDecimal(row[1].toString())  : null)
                .p75Tc(row[2]  != null ? new java.math.BigDecimal(row[2].toString())  : null)
                .avgTc(row[3]  != null ? new java.math.BigDecimal(row[3].toString())  : null)
                .p25Base(row[4] != null ? new java.math.BigDecimal(row[4].toString()) : null)
                .p50Base(row[5] != null ? new java.math.BigDecimal(row[5].toString()) : null)
                .p75Base(row[6] != null ? new java.math.BigDecimal(row[6].toString()) : null)
                .avgBase(row[7] != null ? new java.math.BigDecimal(row[7].toString()) : null)
                .avgBonus(row[8]  != null ? new java.math.BigDecimal(row[8].toString())  : null)
                .avgEquity(row[9] != null ? new java.math.BigDecimal(row[9].toString()) : null)
                .broadened(broadened).broadeningReason(broadeningReason).build();
    }

    @Transactional(readOnly = true)
    @org.springframework.cache.annotation.Cacheable(value = "analytics", key = "'salaryTrends'")
    public List<com.salaryinsights.dto.response.CompanyTrendDTO> getSalaryTrends() {
        return salaryEntryRepository.salaryTrendsRaw().stream().map(row -> {
            String idStr = row[0] != null ? row[0].toString() : null;
            UUID cId = null;
            try { if (idStr != null) cId = UUID.fromString(idStr); } catch (IllegalArgumentException ignored) {}
            return new com.salaryinsights.dto.response.CompanyTrendDTO(
                    cId,
                    row[1] != null ? row[1].toString() : null,
                    row[2] != null ? new java.math.BigDecimal(row[2].toString()) : null,
                    row[3] != null ? new java.math.BigDecimal(row[3].toString()) : null,
                    row[4] != null ? ((Number) row[4]).longValue() : 0L,
                    row[5] != null ? ((Number) row[5]).longValue() : 0L);
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    @org.springframework.cache.annotation.Cacheable(value = "companyList", key = "'hiringNow'")
    public List<com.salaryinsights.dto.response.CompanyHiringDTO> getHiringNow() {
        return opportunityRepository.companyOpenRoleCountsRaw().stream().map(row -> {
            String idStr = row[0] != null ? row[0].toString() : null;
            UUID cId = null;
            try { if (idStr != null) cId = UUID.fromString(idStr); } catch (IllegalArgumentException ignored) {}
            return new com.salaryinsights.dto.response.CompanyHiringDTO(
                    cId, row[1] != null ? ((Number) row[1]).longValue() : 0L);
        }).collect(Collectors.toList());
    }
}
