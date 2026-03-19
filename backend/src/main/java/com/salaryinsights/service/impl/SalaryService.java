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

    // ── Public salary list — multiselect location + level ────────────────────

    @Transactional(readOnly = true)
    public PagedResponse<SalaryResponse> getApprovedSalaries(
            UUID companyId, String companyName, String jobTitle,
            List<String> locations, List<String> experienceLevelStrs,
            Pageable pageable) {

        final String companyNameFilter = (companyName != null && !companyName.isBlank()) ? companyName.toLowerCase() : null;
        final String jobTitleFilter    = (jobTitle    != null && !jobTitle.isBlank())    ? jobTitle.toLowerCase()    : null;
        final UUID   companyIdFilter   = companyId;

        final List<String> locationEnumNames = (locations != null && !locations.isEmpty())
            ? locations.stream()
                .map(l -> {
                    for (com.salaryinsights.enums.Location loc : com.salaryinsights.enums.Location.values()) {
                        if (loc.getDisplayName().equalsIgnoreCase(l) || loc.name().equalsIgnoreCase(l)) return loc.name();
                    }
                    return l;
                })
                .collect(java.util.stream.Collectors.toList())
            : null;

        final List<ExperienceLevel> levelFilters = (experienceLevelStrs != null && !experienceLevelStrs.isEmpty())
            ? experienceLevelStrs.stream()
                .map(s -> { try { return ExperienceLevel.valueOf(s.toUpperCase()); } catch (IllegalArgumentException e) { return null; } })
                .filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toList())
            : null;

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
                if (companyIdFilter != null) predicates.add(cb.equal(companyJoin.get("id"), companyIdFilter));
                if (companyNameFilter != null || jobTitleFilter != null) {
                    String searchTerm = companyNameFilter != null ? companyNameFilter : jobTitleFilter;
                    predicates.add(cb.or(
                        cb.like(cb.lower(companyJoin.get("name")), "%" + searchTerm + "%"),
                        cb.like(cb.lower(root.get("jobTitle")), "%" + searchTerm + "%")
                    ));
                }
                if (locationEnumNames != null && !locationEnumNames.isEmpty())
                    predicates.add(root.get("location").in(locationEnumNames));
                if (levelFilters != null && !levelFilters.isEmpty())
                    predicates.add(root.get("experienceLevel").in(levelFilters));
                return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
            };

        Page<SalaryEntry> page = salaryEntryRepository.findAll(spec, pageable);
        List<SalaryResponse> mapped = page.getContent().stream()
                .map(salaryMapper::toResponse)
                .collect(java.util.stream.Collectors.toList());
        return PagedResponse.<SalaryResponse>builder()
                .content(mapped).page(page.getNumber()).size(page.getSize())
                .totalElements(page.getTotalElements()).totalPages(page.getTotalPages()).last(page.isLast())
                .build();
    }

    // ── Admin: pending ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PagedResponse<SalaryResponse> getPendingSalaries(Pageable pageable) {
        long totalPending = salaryEntryRepository.countByReviewStatus(ReviewStatus.PENDING);
        log.info("getPendingSalaries called — total PENDING in DB: {}, page: {}", totalPending, pageable);
        Page<SalaryEntry> page = salaryEntryRepository.findByReviewStatusWithDetails(ReviewStatus.PENDING, pageable);
        log.info("findByReviewStatus returned {} entries on this page", page.getNumberOfElements());
        List<SalaryResponse> mapped = page.getContent().stream()
                .map(entry -> {
                    try { return salaryMapper.toResponse(entry); }
                    catch (Exception e) { log.error("Failed to map SalaryEntry id={}: {}", entry.getId(), e.getMessage(), e); throw e; }
                })
                .collect(java.util.stream.Collectors.toList());
        log.info("Mapped {} entries successfully", mapped.size());
        return PagedResponse.<SalaryResponse>builder()
                .content(mapped).page(page.getNumber()).size(page.getSize())
                .totalElements(page.getTotalElements()).totalPages(page.getTotalPages()).last(page.isLast())
                .build();
    }

    @Transactional(readOnly = true)
    public SalaryResponse getSalaryById(UUID id) {
        SalaryEntry entry = salaryEntryRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Salary entry not found: " + id));
        return salaryMapper.toResponse(entry);
    }

    // ── Submission ────────────────────────────────────────────────────────────

    @Transactional
    public SalaryResponse submitSalary(SalaryRequest request) {
        Company company;
        if (request.getCompanyId() != null) {
            company = companyRepository.findById(request.getCompanyId())
                    .orElseThrow(() -> new ResourceNotFoundException("Company not found: " + request.getCompanyId()));
        } else if (request.getCompanyName() != null && !request.getCompanyName().isBlank()) {
            company = companyRepository.findByNameIgnoreCase(request.getCompanyName().trim())
                    .orElseGet(() -> {
                        com.salaryinsights.entity.Company nc = com.salaryinsights.entity.Company.builder()
                                .name(request.getCompanyName().trim()).status(com.salaryinsights.enums.CompanyStatus.ACTIVE).build();
                        com.salaryinsights.entity.Company saved = companyRepository.save(nc);
                        log.info("Auto-created company: {}", saved.getName());
                        auditLogService.log("Company", saved.getId().toString(), "AUTO_CREATED",
                                "Company auto-created during salary submission: " + saved.getName());
                        return saved;
                    });
        } else {
            throw new com.salaryinsights.exception.BadRequestException("Either companyId or companyName must be provided");
        }

        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User submitter = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        SalaryEntry entry = salaryMapper.toEntity(request);
        if (entry.getExperienceLevel() == null) entry.setExperienceLevel(deriveExperienceLevel(request));
        entry.setCompany(company);
        entry.setSubmittedBy(submitter);
        entry.setStandardizedLevel(null);
        entry.setReviewStatus(ReviewStatus.PENDING);
        entry = salaryEntryRepository.save(entry);
        log.info("Salary SAVED — id={}, reviewStatus={}, company={}, submittedBy={}",
                entry.getId(), entry.getReviewStatus(), company.getName(), email);
        auditLogService.log("SalaryEntry", entry.getId().toString(), "SUBMITTED",
                "Submitted salary for " + company.getName());
        return salaryMapper.toResponse(entry);
    }

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
                case STAFF_ENGINEER, PRINCIPAL_ENGINEER, ARCHITECT -> ExperienceLevel.LEAD;
                case ENGINEERING_MANAGER, SR_ENGINEERING_MANAGER   -> ExperienceLevel.MANAGER;
                case DIRECTOR, SR_DIRECTOR -> ExperienceLevel.DIRECTOR;
                case VP                   -> ExperienceLevel.VP;
            };
        }
        return ExperienceLevel.MID;
    }

    // ── Admin review ──────────────────────────────────────────────────────────

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "analytics", allEntries = true)
    public SalaryResponse reviewSalary(UUID id, ReviewStatus status, String reason) {
        if (status == ReviewStatus.PENDING) throw new BadRequestException("Cannot set status to PENDING");
        SalaryEntry entry = salaryEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Salary entry not found: " + id));
        if (entry.getReviewStatus() != ReviewStatus.PENDING) throw new BadRequestException("Entry has already been reviewed");
        entry.setReviewStatus(status);
        if (status == ReviewStatus.REJECTED && reason != null) entry.setRejectionReason(reason);
        entry = salaryEntryRepository.save(entry);
        auditLogService.log("SalaryEntry", id.toString(), status.name(),
                "Salary " + status.name().toLowerCase() + " for company: " + entry.getCompany().getName());
        return salaryMapper.toResponse(entry);
    }

    // ── Analytics ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    @org.springframework.cache.annotation.Cacheable(value = "analytics", key = "'byLocation'")
    public List<SalaryAggregationDTO> getAvgSalaryByLocation() {
        return salaryEntryRepository.avgSalaryByLocationRaw().stream().map(row -> {
            String enumName = row[0] != null ? row[0].toString() : null;
            String displayName = enumName;
            if (enumName != null) { try { displayName = com.salaryinsights.enums.Location.valueOf(enumName).getDisplayName(); } catch (IllegalArgumentException ignored) {} }
            SalaryAggregationDTO dto = new SalaryAggregationDTO();
            dto.setGroupKey(displayName);
            dto.setAvgBaseSalary(row[1] != null ? ((Number) row[1]).doubleValue() : null);
            dto.setAvgBonus(row[2] != null ? ((Number) row[2]).doubleValue() : null);
            dto.setAvgEquity(row[3] != null ? ((Number) row[3]).doubleValue() : null);
            dto.setAvgTotalCompensation(row[4] != null ? ((Number) row[4]).doubleValue() : null);
            dto.setCount(row[5] != null ? ((Number) row[5]).longValue() : 0L);
            return dto;
        }).collect(java.util.stream.Collectors.toList());
    }

    @Transactional(readOnly = true)
    @org.springframework.cache.annotation.Cacheable(value = "analytics", key = "'byLocationLevel'")
    public List<com.salaryinsights.dto.response.LocationLevelSalaryDTO> getAvgSalaryByLocationAndLevel() {
        return salaryEntryRepository.avgSalaryByLocationAndLevelRaw().stream().map(row -> {
            String enumName = row[0] != null ? row[0].toString() : null;
            String displayName = enumName;
            if (enumName != null) { try { displayName = com.salaryinsights.enums.Location.valueOf(enumName).getDisplayName(); } catch (IllegalArgumentException ignored) {} }
            com.salaryinsights.dto.response.LocationLevelSalaryDTO dto = new com.salaryinsights.dto.response.LocationLevelSalaryDTO();
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
        List<String> locationEnumNames = null;
        if (locationDisplayNames != null && !locationDisplayNames.isEmpty()) {
            locationEnumNames = locationDisplayNames.stream()
                .map(name -> {
                    for (com.salaryinsights.enums.Location loc : com.salaryinsights.enums.Location.values()) {
                        if (loc.getDisplayName().equalsIgnoreCase(name) || loc.name().equalsIgnoreCase(name)) return loc.name();
                    }
                    return name;
                })
                .collect(java.util.stream.Collectors.toList());
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
        }).collect(java.util.stream.Collectors.toList());
    }

    @Transactional(readOnly = true)
    @org.springframework.cache.annotation.Cacheable(value = "analytics", key = "'byCompany'")
    public List<SalaryAggregationDTO> getAvgSalaryByCompany() {
        return salaryEntryRepository.avgSalaryByCompanyRaw().stream().map(row -> {
            LocalDateTime recent = row[9] != null ? ((java.sql.Timestamp) row[9]).toLocalDateTime() : null;
            Long count = row[8] != null ? ((Number) row[8]).longValue() : 0L;
            String[] conf = computeConfidence(count, recent);
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
        key = "'byCompanyLevel_' + T(java.util.Arrays).toString(#locationDisplayNames.stream().sorted().toArray())"
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

    private String[] computeConfidence(long count, LocalDateTime mostRecent) {
        if (count < 2) return new String[]{"INSUFFICIENT", "Insufficient data · " + count + " entr" + (count == 1 ? "y" : "ies")};
        double monthsAgo = mostRecent != null ? ChronoUnit.DAYS.between(mostRecent, LocalDateTime.now()) / 30.0 : 24.0;
        double score = Math.log(count + 1) * Math.exp(-0.05 * monthsAgo);
        String tier = score >= 1.5 ? "HIGH" : score >= 0.6 ? "MEDIUM" : "LOW";
        long mo = Math.round(monthsAgo);
        String recencyStr = mo <= 1 ? "updated recently" : mo < 12 ? "updated " + mo + "mo ago" : "updated " + (mo / 12) + "yr ago";
        return new String[]{tier, tier.charAt(0) + tier.substring(1).toLowerCase() + " · " + count + " entr" + (count == 1 ? "y" : "ies") + " · " + recencyStr};
    }

    // ── Admin dashboard ───────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AdminDashboardResponse getAdminDashboard() {
        List<Object[]> trends = salaryEntryRepository.submissionTrendLast12Months();
        List<java.util.Map<String, Object>> trendData = trends.stream().map(row -> {
            java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("month", row[0] != null ? row[0].toString() : "");
            m.put("count", row[1]);
            return m;
        }).collect(java.util.stream.Collectors.toList());
        return AdminDashboardResponse.builder()
                .totalCompanies(companyRepository.count())
                .activeCompanies(companyRepository.countByStatus(com.salaryinsights.enums.CompanyStatus.ACTIVE))
                .pendingReviews(salaryEntryRepository.countByReviewStatus(ReviewStatus.PENDING))
                .totalSalaryEntries(salaryEntryRepository.count())
                .approvedEntries(salaryEntryRepository.countByReviewStatus(ReviewStatus.APPROVED))
                .rejectedEntries(salaryEntryRepository.countByReviewStatus(ReviewStatus.REJECTED))
                .avgBaseSalary(salaryEntryRepository.avgBaseSalaryApproved())
                .submissionTrend(trendData)
                .build();
    }
}
