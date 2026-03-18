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

    @Transactional(readOnly = true)
    public PagedResponse<SalaryResponse> getApprovedSalaries(
            UUID companyId, String companyName, String jobTitle, String location,
            ExperienceLevel experienceLevel, Pageable pageable) {

        // Build a single Specification that handles all filters in ONE lambda.
        // This avoids the dual-join problem: fetch("company") in one lambda + get("company")
        // in another creates two separate joins on the same association, breaking filters.
        final String companyNameFilter  = (companyName  != null && !companyName.isBlank())  ? companyName.toLowerCase()  : null;
        final String jobTitleFilter     = (jobTitle     != null && !jobTitle.isBlank())      ? jobTitle.toLowerCase()     : null;
        final String locationFilter     = (location     != null && !location.isBlank())      ? location.toLowerCase()     : null;
        final UUID   companyIdFilter    = companyId;
        final ExperienceLevel levelFilter = experienceLevel;

        org.springframework.data.jpa.domain.Specification<SalaryEntry> spec =
            (root, query, cb) -> {
                boolean isCountQuery = query.getResultType() == Long.class || query.getResultType() == long.class;

                // Always use a plain join for filtering — safe and reliable
                jakarta.persistence.criteria.Join<Object, Object> companyJoin =
                    root.join("company", jakarta.persistence.criteria.JoinType.LEFT);

                // Only add fetch joins on the main SELECT query, not the COUNT query
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
                // companyName and jobTitle come from the same search box —
                // use OR so typing "Google" matches entries where company name OR job title contains it
                if (companyNameFilter != null || jobTitleFilter != null) {
                    String searchTerm = companyNameFilter != null ? companyNameFilter : jobTitleFilter;
                    jakarta.persistence.criteria.Predicate byCompany =
                        cb.like(cb.lower(companyJoin.get("name")), "%" + searchTerm + "%");
                    jakarta.persistence.criteria.Predicate byTitle =
                        cb.like(cb.lower(root.get("jobTitle")), "%" + searchTerm + "%");
                    predicates.add(cb.or(byCompany, byTitle));
                }
                if (locationFilter != null) {
                    predicates.add(cb.like(cb.lower(root.get("location")), "%" + locationFilter + "%"));
                }
                if (levelFilter != null) {
                    predicates.add(cb.equal(root.get("experienceLevel"), levelFilter));
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
        Page<SalaryEntry> page = salaryEntryRepository.findByReviewStatus(ReviewStatus.PENDING, pageable);
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
        entry.setCompany(company);
        entry.setSubmittedBy(submitter);
        entry.setStandardizedLevel(standardizedLevel);
        entry.setReviewStatus(ReviewStatus.PENDING);

        entry = salaryEntryRepository.save(entry);
        log.info("Salary SAVED — id={}, reviewStatus={}, company={}, submittedBy={}",
                entry.getId(), entry.getReviewStatus(), company.getName(), currentUserEmail);
        auditLogService.log("SalaryEntry", entry.getId().toString(), "SUBMITTED",
                "Submitted salary for " + company.getName());

        return salaryMapper.toResponse(entry);
    }

    @Transactional
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
        auditLogService.log("SalaryEntry", id.toString(), status.name(),
                "Salary " + status.name().toLowerCase() + " for company: " + entry.getCompany().getName());

        return salaryMapper.toResponse(entry);
    }

    // Analytics
    @Transactional(readOnly = true)
    public List<SalaryAggregationDTO> getAvgSalaryByLocation() {
        return salaryEntryRepository.avgSalaryByLocationRaw().stream().map(row -> {
            String enumName = row[0] != null ? row[0].toString() : null;
            // Convert DB enum name (e.g. "DELHI_NCR") to display name via Location enum
            String displayName = enumName;
            if (enumName != null) {
                try {
                    com.salaryinsights.enums.Location loc = com.salaryinsights.enums.Location.valueOf(enumName);
                    displayName = loc.getDisplayName();
                } catch (IllegalArgumentException ignored) { }
            }
            Double avgBase  = row[1] != null ? ((Number) row[1]).doubleValue() : null;
            Double avgTotal = row[2] != null ? ((Number) row[2]).doubleValue() : null;
            Long   count    = row[3] != null ? ((Number) row[3]).longValue()   : 0L;
            return new SalaryAggregationDTO(displayName, avgBase, avgTotal, count);
        }).collect(java.util.stream.Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SalaryAggregationDTO> getAvgSalaryByCompany() {
        return salaryEntryRepository.avgSalaryByCompanyRaw().stream().map(row -> {
            String name     = row[0] != null ? row[0].toString() : null;
            Double avgBase  = row[1] != null ? ((Number) row[1]).doubleValue() : null;
            Double avgTotal = row[2] != null ? ((Number) row[2]).doubleValue() : null;
            Long   count    = row[3] != null ? ((Number) row[3]).longValue()   : 0L;
            return new SalaryAggregationDTO(name, avgBase, avgTotal, count);
        }).collect(java.util.stream.Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<com.salaryinsights.dto.response.CompanyLevelSalaryDTO> getAvgSalaryByCompanyAndLevel() {
        return salaryEntryRepository.avgSalaryByCompanyAndLevelRaw().stream().map(row -> {
            String companyName   = row[0] != null ? row[0].toString() : null;
            String internalLevel = row[1] != null ? row[1].toString() : null;
            Double avgBase       = row[2] != null ? ((Number) row[2]).doubleValue() : null;
            Double avgBonus      = row[3] != null ? ((Number) row[3]).doubleValue() : null;
            Double avgEquity     = row[4] != null ? ((Number) row[4]).doubleValue() : null;
            Long   count         = row[5] != null ? ((Number) row[5]).longValue()   : 0L;
            com.salaryinsights.dto.response.CompanyLevelSalaryDTO dto =
                new com.salaryinsights.dto.response.CompanyLevelSalaryDTO();
            dto.setCompanyName(companyName);
            dto.setInternalLevel(internalLevel);
            dto.setAvgBaseSalary(avgBase);
            dto.setAvgBonus(avgBonus);
            dto.setAvgEquity(avgEquity);
            dto.setCount(count);
            return dto;
        }).collect(java.util.stream.Collectors.toList());
    }

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
