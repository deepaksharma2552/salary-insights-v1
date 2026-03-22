package com.salaryinsights.service.impl;

import com.salaryinsights.dto.request.CompanyRequest;
import com.salaryinsights.dto.response.CompanyResponse;
import com.salaryinsights.dto.response.PagedResponse;
import com.salaryinsights.entity.Company;
import com.salaryinsights.enums.CompanyStatus;
import com.salaryinsights.exception.BadRequestException;
import com.salaryinsights.exception.ResourceNotFoundException;
import com.salaryinsights.mapper.CompanyMapper;
import com.salaryinsights.repository.SalaryEntryRepository;
import com.salaryinsights.repository.CompanyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final CompanyMapper companyMapper;
    private final SalaryEntryRepository salaryEntryRepository;
    private final AuditLogService auditLogService;

    @org.springframework.cache.annotation.Cacheable(
        value = "companyList",
        key = "'page:' + #pageable.pageNumber + ':size:' + #pageable.pageSize + ':name:' + #name + ':industry:' + #industry + ':location:' + #location"
    )
    public PagedResponse<CompanyResponse> getAllCompanies(String name, String industry, String location, Pageable pageable) {
        Page<Company> page = companyRepository.searchCompanies(CompanyStatus.ACTIVE, name, industry, location, pageable);
        List<com.salaryinsights.dto.response.CompanyResponse> enriched = page.getContent().stream()
                .map(c -> {
                    com.salaryinsights.dto.response.CompanyResponse r = enrichWithStats(companyMapper.toResponse(c), c.getId());
                    r.setTcMin(c.getTcMin());
                    r.setTcMax(c.getTcMax());
                    return r;
                })
                .collect(java.util.stream.Collectors.toList());
        return com.salaryinsights.dto.response.PagedResponse.<com.salaryinsights.dto.response.CompanyResponse>builder()
                .content(enriched)
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .build();
    }

    private com.salaryinsights.dto.response.CompanyResponse enrichWithStats(
            com.salaryinsights.dto.response.CompanyResponse response, java.util.UUID companyId) {
        response.setEntryCount(salaryEntryRepository.countApprovedByCompany(companyId));
        response.setAvgBaseSalary(salaryEntryRepository.avgBaseSalaryByCompany(companyId));
        response.setAvgTotalCompensation(salaryEntryRepository.avgTotalCompByCompany(companyId));
        // tcMin / tcMax are stored on the companies row (backfilled by V22, kept fresh by salary approval)
        // — already mapped by CompanyMapper.toResponse, no extra query needed here.
        return response;
    }

    public PagedResponse<CompanyResponse> getAllCompaniesAdmin(String name, Pageable pageable) {
        Page<Company> page = (name != null && !name.isBlank())
                ? companyRepository.searchAllCompanies(name.trim(), pageable)
                : companyRepository.findAll(pageable);
        return PagedResponse.of(page.map(companyMapper::toResponse));
    }

    public CompanyResponse getCompanyById(UUID id) {
        Company c = findCompanyById(id);
        return enrichWithStats(companyMapper.toResponse(c), c.getId());
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "companyList", allEntries = true)
    public CompanyResponse createCompany(CompanyRequest request) {
        if (companyRepository.existsByName(request.getName())) {
            throw new BadRequestException("Company with name '" + request.getName() + "' already exists");
        }

        Company company = companyMapper.toEntity(request);
        company = companyRepository.save(company);

        auditLogService.log("Company", company.getId().toString(), "CREATED",
                "Created company: " + company.getName());

        log.info("Created company: {}", company.getName());
        return companyMapper.toResponse(company);
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "companyList", allEntries = true)
    public CompanyResponse updateCompany(UUID id, CompanyRequest request) {
        Company company = findCompanyById(id);
        companyMapper.updateEntity(company, request);
        company = companyRepository.save(company);

        auditLogService.log("Company", id.toString(), "UPDATED",
                "Updated company: " + company.getName());

        return companyMapper.toResponse(company);
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "companyList", allEntries = true)
    public void toggleStatus(UUID id) {
        Company company = findCompanyById(id);
        CompanyStatus newStatus = company.getStatus() == CompanyStatus.ACTIVE
                ? CompanyStatus.INACTIVE : CompanyStatus.ACTIVE;
        company.setStatus(newStatus);
        companyRepository.save(company);

        auditLogService.log("Company", id.toString(), "STATUS_CHANGED",
                "Status changed to " + newStatus + " for: " + company.getName());
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "companyList", allEntries = true)
    public void deleteCompany(UUID id) {
        Company company = findCompanyById(id);
        companyRepository.delete(company);
        auditLogService.log("Company", id.toString(), "DELETED", "Deleted company: " + company.getName());
    }

    public List<String> getIndustries() {
        return companyRepository.findDistinctIndustries();
    }

    /**
     * Lazy salary breakdown by internal level for a single company.
     * Called by the card "Breakdown by level" toggle — cached 1 hour.
     */
    @Transactional(readOnly = true)
    @org.springframework.cache.annotation.Cacheable(value = "analytics", key = "'salarySummary:' + #id")
    public com.salaryinsights.dto.response.CompanySalarySummaryResponse getSalarySummary(UUID id) {
        Company company = findCompanyById(id);
        List<Object[]> rows = salaryEntryRepository.salarySummaryByLevel(id);

        List<com.salaryinsights.dto.response.CompanySalarySummaryResponse.LevelRow> levels =
            rows.stream().map(row -> com.salaryinsights.dto.response.CompanySalarySummaryResponse.LevelRow.builder()
                .internalLevel(row[0] != null ? row[0].toString() : "Other")
                .avgBase(row[1]  != null ? ((Number) row[1]).doubleValue()  : null)
                .avgBonus(row[2] != null ? ((Number) row[2]).doubleValue()  : null)
                .avgEquity(row[3]!= null ? ((Number) row[3]).doubleValue()  : null)
                .avgTC(row[4]    != null ? ((Number) row[4]).doubleValue()  : null)
                .count(row[5]    != null ? ((Number) row[5]).longValue()    : 0L)
                .build()
            ).collect(java.util.stream.Collectors.toList());

        java.math.BigDecimal tcMin = company.getTcMin();
        java.math.BigDecimal tcMax = company.getTcMax();

        return com.salaryinsights.dto.response.CompanySalarySummaryResponse.builder()
            .companyId(id.toString())
            .companyName(company.getName())
            .tcMin(tcMin  != null ? tcMin.doubleValue()  : null)
            .tcMax(tcMax  != null ? tcMax.doubleValue()  : null)
            .levels(levels)
            .build();
    }

    /**
     * Admin: update the benefits list for a company.
     * Benefits are sourced from the company's official benefits page.
     */
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "companyList", allEntries = true)
    public CompanyResponse updateBenefits(UUID id, List<com.salaryinsights.dto.response.BenefitItem> benefits) {
        Company company = findCompanyById(id);
        company.setBenefits(benefits != null ? benefits : new java.util.ArrayList<>());
        Company saved = companyRepository.save(company);
        auditLogService.log("Company", id.toString(), "BENEFITS_UPDATED",
            "Updated benefits for: " + saved.getName());
        return enrichWithStats(companyMapper.toResponse(saved), saved.getId());
    }

    private Company findCompanyById(UUID id) {
        return companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found with id: " + id));
    }
}
