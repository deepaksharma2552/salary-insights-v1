package com.salaryinsights.service.impl;

import com.salaryinsights.dto.request.CompanyLevelRequest;
import com.salaryinsights.dto.request.LevelMappingRequest;
import com.salaryinsights.dto.request.StandardizedLevelRequest;
import com.salaryinsights.dto.response.CompanyLevelResponse;
import com.salaryinsights.dto.response.StandardizedLevelResponse;
import com.salaryinsights.entity.*;
import com.salaryinsights.exception.BadRequestException;
import com.salaryinsights.exception.ResourceNotFoundException;
import com.salaryinsights.mapper.LevelMapper;
import com.salaryinsights.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class LevelMappingService {

    private final StandardizedLevelRepository standardizedLevelRepository;
    private final CompanyLevelRepository companyLevelRepository;
    private final LevelMappingRepository levelMappingRepository;
    private final CompanyRepository companyRepository;
    private final AuditLogService auditLogService;
    private final LevelMapper levelMapper;

    // ─── Standardized Levels ────────────────────────────────────────────────

    public List<StandardizedLevelResponse> getAllStandardizedLevels() {
        return standardizedLevelRepository.findAll()
                .stream()
                .sorted((a, b) -> a.getHierarchyRank().compareTo(b.getHierarchyRank()))
                .map(levelMapper::toStandardizedResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public StandardizedLevelResponse createStandardizedLevel(StandardizedLevelRequest request) {
        if (standardizedLevelRepository.existsByName(request.getName())) {
            throw new BadRequestException("Standardized level already exists: " + request.getName());
        }

        StandardizedLevel level = StandardizedLevel.builder()
                .name(request.getName())
                .hierarchyRank(request.getHierarchyRank())
                .build();

        level = standardizedLevelRepository.save(level);
        auditLogService.log("StandardizedLevel", level.getId().toString(), "CREATED", "Created: " + level.getName());
        return levelMapper.toStandardizedResponse(level);
    }

    @Transactional
    public StandardizedLevelResponse updateStandardizedLevel(UUID id, StandardizedLevelRequest request) {
        StandardizedLevel level = standardizedLevelRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Standardized level not found: " + id));
        level.setName(request.getName());
        level.setHierarchyRank(request.getHierarchyRank());
        level = standardizedLevelRepository.save(level);
        return levelMapper.toStandardizedResponse(level);
    }

    @Transactional
    public void deleteStandardizedLevel(UUID id) {
        StandardizedLevel level = standardizedLevelRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Standardized level not found: " + id));
        standardizedLevelRepository.delete(level);
        auditLogService.log("StandardizedLevel", id.toString(), "DELETED", "Deleted: " + level.getName());
    }

    // ─── Company Levels ─────────────────────────────────────────────────────

    public List<CompanyLevelResponse> getCompanyLevels(UUID companyId) {
        List<CompanyLevel> levels = companyLevelRepository.findByCompanyIdWithMappings(companyId);
        return levels.stream().map(levelMapper::toCompanyLevelResponse).collect(Collectors.toList());
    }

    @Transactional
    public CompanyLevelResponse createCompanyLevel(CompanyLevelRequest request) {
        Company company = companyRepository.findById(request.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Company not found: " + request.getCompanyId()));

        companyLevelRepository.findByCompanyIdAndInternalLevelName(
                request.getCompanyId(), request.getInternalLevelName())
                .ifPresent(l -> { throw new BadRequestException("Level already exists: " + request.getInternalLevelName()); });

        CompanyLevel level = CompanyLevel.builder()
                .company(company)
                .internalLevelName(request.getInternalLevelName())
                .build();

        level = companyLevelRepository.save(level);
        auditLogService.log("CompanyLevel", level.getId().toString(), "CREATED",
                "Created level '" + level.getInternalLevelName() + "' for company: " + company.getName());

        return levelMapper.toCompanyLevelResponse(level);
    }

    @Transactional
    public void deleteCompanyLevel(UUID id) {
        CompanyLevel level = companyLevelRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company level not found: " + id));
        companyLevelRepository.delete(level);
    }

    // ─── Level Mappings ─────────────────────────────────────────────────────

    @Transactional
    public CompanyLevelResponse createOrUpdateMapping(LevelMappingRequest request) {
        CompanyLevel companyLevel = companyLevelRepository.findById(request.getCompanyLevelId())
                .orElseThrow(() -> new ResourceNotFoundException("Company level not found"));

        StandardizedLevel standardizedLevel = standardizedLevelRepository.findById(request.getStandardizedLevelId())
                .orElseThrow(() -> new ResourceNotFoundException("Standardized level not found"));

        LevelMapping mapping = levelMappingRepository.findByCompanyLevelId(request.getCompanyLevelId())
                .orElse(LevelMapping.builder().companyLevel(companyLevel).build());

        mapping.setStandardizedLevel(standardizedLevel);
        levelMappingRepository.save(mapping);

        auditLogService.log("LevelMapping", mapping.getId() != null ? mapping.getId().toString() : "new",
                "MAPPED",
                String.format("Mapped '%s' → '%s'",
                        companyLevel.getInternalLevelName(), standardizedLevel.getName()));

        return levelMapper.toCompanyLevelResponse(
                companyLevelRepository.findByCompanyIdWithMappings(companyLevel.getCompany().getId())
                        .stream().filter(cl -> cl.getId().equals(companyLevel.getId())).findFirst()
                        .orElse(companyLevel));
    }

    @Transactional
    public void deleteMapping(UUID companyLevelId) {
        LevelMapping mapping = levelMappingRepository.findByCompanyLevelId(companyLevelId)
                .orElseThrow(() -> new ResourceNotFoundException("Mapping not found for company level: " + companyLevelId));
        levelMappingRepository.delete(mapping);
    }

    /**
     * Resolve the standardized level for a salary entry based on company + internal level name.
     */
    @Transactional(readOnly = true)
    public Optional<StandardizedLevel> resolveStandardizedLevel(UUID companyId, String internalLevelName) {
        if (internalLevelName == null || internalLevelName.isBlank()) return Optional.empty();

        return companyLevelRepository.findByCompanyIdAndInternalLevelName(companyId, internalLevelName)
                .flatMap(cl -> Optional.ofNullable(cl.getLevelMapping()))
                .map(LevelMapping::getStandardizedLevel);
    }

    public long getTotalMappings() {
        return levelMappingRepository.count();
    }
}
