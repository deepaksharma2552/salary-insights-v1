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
import java.util.List;
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
        key = "'page:' + #pageable.pageNumber + ':size:' + #pageable.pageSize + ':name:' + #name + ':industry:' + #industry + ':location:' + #location + ':showAll:' + #showAll + ':sortBy:' + #sortBy"
    )
    public PagedResponse<CompanyResponse> getAllCompanies(String name, String industry, String location, String sortBy, boolean showAll, Pageable pageable) {
        // Validate sortBy — default to "entries" if unrecognised
        String sort = (sortBy != null && List.of("entries", "name", "recent").contains(sortBy)) ? sortBy : "entries";
        // hasData = true unless user explicitly asked to showAll or is searching by name
        boolean hasData = !showAll && (name == null || name.isBlank());
        Page<Company> page = companyRepository.searchCompaniesSorted(
                name == null || name.isBlank() ? null : name,
                industry == null || industry.isBlank() ? null : industry,
                sort, hasData, pageable);
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
        if (companyRepository.findByNameIgnoreCase(request.getName()).isPresent()) {
            throw new BadRequestException("Company with name '" + request.getName() + "' already exists");
        }

        Company company = companyMapper.toEntity(request);
        company = companyRepository.save(company);

        auditLogService.log("Company", company.getId().toString(), "CREATED",
                "Created company: " + company.getName());

        log.info("Created company: {}", company.getName());
        return companyMapper.toResponse(company);
    }

    /**
     * Upsert for bulk import: if a company with the same name (case-insensitive) already exists,
     * patch ONLY blank/null fields — never overwrite data the admin has already curated.
     * If the company doesn't exist, create it fresh.
     * Returns a result indicating whether the record was CREATED, PATCHED, or SKIPPED (already complete).
     */
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "companyList", allEntries = true)
    public UpsertResult upsertCompany(CompanyRequest request) {
        java.util.Optional<Company> existing = companyRepository.findByNameIgnoreCase(request.getName());

        if (existing.isEmpty()) {
            // Brand new company — create it
            Company company = companyMapper.toEntity(request);
            company = companyRepository.save(company);
            auditLogService.log("Company", company.getId().toString(), "CREATED",
                    "Bulk import created: " + company.getName());
            log.info("Bulk import — created: {}", company.getName());
            return new UpsertResult(UpsertResult.Action.CREATED, companyMapper.toResponse(company));
        }

        // Company exists — patch only fields that are currently blank/null
        Company company = existing.get();
        boolean changed = false;

        if (isBlank(company.getWebsite())     && hasValue(request.getWebsite()))     { company.setWebsite(request.getWebsite());         changed = true; }
        if (isBlank(company.getLogoUrl())     && hasValue(request.getLogoUrl()))     { company.setLogoUrl(request.getLogoUrl());         changed = true; }
        if (isBlank(company.getIndustry())    && hasValue(request.getIndustry()))    { company.setIndustry(request.getIndustry());       changed = true; }
        if (isBlank(company.getLocation())    && hasValue(request.getLocation()))    { company.setLocation(request.getLocation());       changed = true; }

        if (!changed) {
            log.info("Bulk import — skipped (already complete): {}", company.getName());
            return new UpsertResult(UpsertResult.Action.SKIPPED, companyMapper.toResponse(company));
        }

        company = companyRepository.save(company);
        auditLogService.log("Company", company.getId().toString(), "PATCHED",
                "Bulk import patched blank fields for: " + company.getName());
        log.info("Bulk import — patched blank fields for: {}", company.getName());
        return new UpsertResult(UpsertResult.Action.PATCHED, companyMapper.toResponse(company));
    }

    private static boolean isBlank(String s) { return s == null || s.isBlank(); }
    private static boolean hasValue(String s) { return s != null && !s.isBlank(); }

    /** Result carrier for upsertCompany. */
    public static class UpsertResult {
        public enum Action { CREATED, PATCHED, SKIPPED }
        public final Action action;
        public final CompanyResponse company;
        public UpsertResult(Action action, CompanyResponse company) {
            this.action  = action;
            this.company = company;
        }
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
                .functionName(row[0]  != null ? row[0].toString()             : "Other")
                .internalLevel(row[1] != null ? row[1].toString()             : "Other")
                .avgBase(row[2]       != null ? ((Number) row[2]).doubleValue() : null)
                .avgBonus(row[3]      != null ? ((Number) row[3]).doubleValue() : null)
                .avgEquity(row[4]     != null ? ((Number) row[4]).doubleValue() : null)
                .avgTC(row[5]         != null ? ((Number) row[5]).doubleValue() : null)
                .count(row[6]         != null ? ((Number) row[6]).longValue()   : 0L)
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
