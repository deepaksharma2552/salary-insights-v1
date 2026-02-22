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
    private final LevelMappingService levelMappingService;
    private final SalaryMapper salaryMapper;
    private final AuditLogService auditLogService;

    public PagedResponse<SalaryResponse> getApprovedSalaries(
            UUID companyId, String jobTitle, String location,
            ExperienceLevel experienceLevel, Pageable pageable) {

        Page<SalaryEntry> page = salaryEntryRepository.findApprovedWithFilters(
                companyId, jobTitle, location, experienceLevel, pageable);
        return PagedResponse.of(page.map(salaryMapper::toResponse));
    }

    public PagedResponse<SalaryResponse> getPendingSalaries(Pageable pageable) {
        Page<SalaryEntry> page = salaryEntryRepository.findByReviewStatusWithDetails(ReviewStatus.PENDING, pageable);
        return PagedResponse.of(page.map(salaryMapper::toResponse));
    }

    public SalaryResponse getSalaryById(UUID id) {
        SalaryEntry entry = salaryEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Salary entry not found: " + id));
        return salaryMapper.toResponse(entry);
    }

    @Transactional
    public SalaryResponse submitSalary(SalaryRequest request) {
        Company company = companyRepository.findById(request.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Company not found: " + request.getCompanyId()));

        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User submitter = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Auto-resolve standardized level from company-level mapping
        StandardizedLevel standardizedLevel = levelMappingService
                .resolveStandardizedLevel(company.getId(), request.getCompanyInternalLevel())
                .orElse(null);

        SalaryEntry entry = salaryMapper.toEntity(request);
        entry.setCompany(company);
        entry.setSubmittedBy(submitter);
        entry.setStandardizedLevel(standardizedLevel);
        entry.setReviewStatus(ReviewStatus.PENDING);

        entry = salaryEntryRepository.save(entry);

        log.info("Salary submitted by {} for company {}", currentUserEmail, company.getName());
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
    public List<SalaryAggregationDTO> getAvgSalaryByStandardizedLevel() {
        return salaryEntryRepository.avgSalaryByStandardizedLevel();
    }

    public List<SalaryAggregationDTO> getAvgSalaryByLocation() {
        return salaryEntryRepository.avgSalaryByLocation();
    }

    public List<SalaryAggregationDTO> getAvgSalaryByCompany() {
        return salaryEntryRepository.avgSalaryByCompany();
    }

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
                .totalMappings(levelMappingService.getTotalMappings())
                .submissionTrend(trendData)
                .build();
    }
}
