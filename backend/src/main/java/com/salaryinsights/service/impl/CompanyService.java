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

    public PagedResponse<CompanyResponse> getAllCompanies(String name, String industry, String location, Pageable pageable) {
        Page<Company> page = companyRepository.searchCompanies(CompanyStatus.ACTIVE, name, industry, location, pageable);
        List<com.salaryinsights.dto.response.CompanyResponse> enriched = page.getContent().stream()
                .map(c -> enrichWithStats(companyMapper.toResponse(c), c.getId()))
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
        return response;
    }

    public PagedResponse<CompanyResponse> getAllCompaniesAdmin(Pageable pageable) {
        Page<Company> page = companyRepository.findAll(pageable);
        return PagedResponse.of(page.map(companyMapper::toResponse));
    }

    public CompanyResponse getCompanyById(UUID id) {
        Company c = findCompanyById(id);
        return enrichWithStats(companyMapper.toResponse(c), c.getId());
    }

    @Transactional
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
    public CompanyResponse updateCompany(UUID id, CompanyRequest request) {
        Company company = findCompanyById(id);
        companyMapper.updateEntity(company, request);
        company = companyRepository.save(company);

        auditLogService.log("Company", id.toString(), "UPDATED",
                "Updated company: " + company.getName());

        return companyMapper.toResponse(company);
    }

    @Transactional
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
    public void deleteCompany(UUID id) {
        Company company = findCompanyById(id);
        companyRepository.delete(company);
        auditLogService.log("Company", id.toString(), "DELETED", "Deleted company: " + company.getName());
    }

    public List<String> getIndustries() {
        return companyRepository.findDistinctIndustries();
    }

    private Company findCompanyById(UUID id) {
        return companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found with id: " + id));
    }
}
