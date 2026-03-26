package com.salaryinsights.service.impl;

import com.salaryinsights.dto.request.*;
import com.salaryinsights.dto.response.*;
import com.salaryinsights.entity.*;
import com.salaryinsights.exception.BadRequestException;
import com.salaryinsights.exception.ResourceNotFoundException;
import com.salaryinsights.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GuideLevelService {

    private final GuideStandardLevelRepository standardRepo;
    private final GuideCompanyLevelRepository  companyLevelRepo;
    private final GuideMappingRepository       mappingRepo;
    private final CompanyRepository            companyRepo;
    private final JobFunctionRepository        jobFunctionRepo;

    // ── Standard Levels ───────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<GuideStandardLevelResponse> getAllStandardLevels() {
        return standardRepo.findAllByOrderByRankAsc().stream()
                .map(this::toStandardResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public GuideStandardLevelResponse createStandardLevel(GuideStandardLevelRequest req) {
        if (standardRepo.existsByName(req.getName().trim())) {
            throw new BadRequestException("Standard level already exists: " + req.getName());
        }
        GuideStandardLevel level = GuideStandardLevel.builder()
                .name(req.getName().trim())
                .rank(req.getRank())
                .description(req.getDescription())
                .build();
        return toStandardResponse(standardRepo.save(level));
    }

    @Transactional
    public GuideStandardLevelResponse updateStandardLevel(UUID id, GuideStandardLevelRequest req) {
        GuideStandardLevel level = standardRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Standard level not found: " + id));
        level.setName(req.getName().trim());
        level.setRank(req.getRank());
        level.setDescription(req.getDescription());
        return toStandardResponse(standardRepo.save(level));
    }

    @Transactional
    public void deleteStandardLevel(UUID id) {
        GuideStandardLevel level = standardRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Standard level not found: " + id));
        standardRepo.delete(level);
    }

    // ── Company Levels ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<GuideCompanyLevelResponse> getCompanyLevels(UUID companyId) {
        return companyLevelRepo.findByCompanyIdWithMapping(companyId).stream()
                .map(this::toCompanyLevelResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public GuideCompanyLevelResponse createCompanyLevel(GuideCompanyLevelRequest req) {
        Company company = companyRepo.findById(req.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Company not found: " + req.getCompanyId()));
        if (companyLevelRepo.existsByCompanyIdAndTitle(req.getCompanyId(), req.getTitle().trim())) {
            throw new BadRequestException("Level '" + req.getTitle() + "' already exists for " + company.getName());
        }
        String fn = (req.getFunctionCategory() != null && !req.getFunctionCategory().isBlank())
                ? req.getFunctionCategory().trim()
                : null;
        if (fn != null) {
            boolean valid = jobFunctionRepo.existsByName(fn.toUpperCase())
                         || jobFunctionRepo.existsByDisplayName(fn);
            if (!valid) {
                throw new BadRequestException("Unknown function category: " + fn
                        + ". Must match a job function name.");
            }
        } else {
            throw new BadRequestException("functionCategory is required.");
        }
        GuideCompanyLevel cl = GuideCompanyLevel.builder()
                .company(company)
                .title(req.getTitle().trim())
                .description(req.getDescription())
                .functionCategory(fn)
                .build();
        return toCompanyLevelResponse(companyLevelRepo.save(cl));
    }

    @Transactional
    public void deleteCompanyLevel(UUID id) {
        GuideCompanyLevel cl = companyLevelRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company level not found: " + id));
        companyLevelRepo.delete(cl);
    }

    // ── Mappings ──────────────────────────────────────────────────────────────

    /**
     * Replaces all mappings for a company level with the submitted entries.
     * Validates that percentages sum to exactly 100.
     */
    @Transactional
    public GuideCompanyLevelResponse saveOverlapMappings(GuideMappingRequest req) {
        GuideCompanyLevel cl = companyLevelRepo.findById(req.getGuideCompanyLevelId())
                .orElseThrow(() -> new ResourceNotFoundException("Company level not found"));

        // Validate entries exist
        if (req.getEntries() == null || req.getEntries().isEmpty()) {
            throw new BadRequestException("At least one mapping entry is required");
        }

        // Validate percentages sum to 100
        int total = req.getEntries().stream().mapToInt(GuideMappingRequest.MappingEntry::getOverlapPct).sum();
        if (total != 100) {
            throw new BadRequestException("Overlap percentages must sum to 100, got " + total);
        }

        // Delete all existing mappings for this company level
        mappingRepo.deleteAllByCompanyLevelId(cl.getId());

        // Insert new mappings
        for (GuideMappingRequest.MappingEntry entry : req.getEntries()) {
            GuideStandardLevel sl = standardRepo.findById(entry.getGuideStandardLevelId())
                    .orElseThrow(() -> new ResourceNotFoundException("Standard level not found: " + entry.getGuideStandardLevelId()));
            GuideMapping mapping = GuideMapping.builder()
                    .guideCompanyLevel(cl)
                    .guideStandardLevel(sl)
                    .overlapPct(entry.getOverlapPct())
                    .build();
            mappingRepo.save(mapping);
        }

        // Reload
        GuideCompanyLevel reloaded = companyLevelRepo.findByCompanyIdWithMapping(cl.getCompany().getId())
                .stream().filter(l -> l.getId().equals(cl.getId())).findFirst()
                .orElse(cl);
        return toCompanyLevelResponse(reloaded);
    }

    @Transactional
    public void deleteAllMappings(UUID guideCompanyLevelId) {
        mappingRepo.deleteAllByCompanyLevelId(guideCompanyLevelId);
    }

    // ── Public grid ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public GuideLevelGridResponse buildGrid(List<UUID> companyIds, String functionCategory) {
        if (companyIds == null || companyIds.isEmpty()) {
            GuideLevelGridResponse empty = new GuideLevelGridResponse();
            empty.setStandardLevels(List.of());
            empty.setCompanies(List.of());
            empty.setGrid(Map.of());
            return empty;
        }

        List<UUID> capped = companyIds.size() > 5 ? companyIds.subList(0, 5) : companyIds;

        boolean hasFunction = functionCategory != null && !functionCategory.isBlank()
                && !functionCategory.equalsIgnoreCase("All");
        List<GuideMapping> mappings = hasFunction
                ? mappingRepo.findByCompanyIdsAndFunction(capped, functionCategory)
                : mappingRepo.findByCompanyIds(capped);

        Map<String, GuideLevelGridResponse.CompanyCol> companyMap = new LinkedHashMap<>();
        for (UUID id : capped) companyMap.put(id.toString(), null);

        Map<String, GuideLevelGridResponse.StandardLevelRow> stdMap = new LinkedHashMap<>();

        // grid[standardLevelId][companyId] = list of GridCell (1:many now)
        Map<String, Map<String, List<GuideLevelGridResponse.GridCell>>> grid = new LinkedHashMap<>();

        for (GuideMapping gm : mappings) {
            GuideStandardLevel gsl = gm.getGuideStandardLevel();
            GuideCompanyLevel  gcl = gm.getGuideCompanyLevel();
            Company            co  = gcl.getCompany();

            String stdId = gsl.getId().toString();
            String coId  = co.getId().toString();

            stdMap.computeIfAbsent(stdId, k -> {
                GuideLevelGridResponse.StandardLevelRow row = new GuideLevelGridResponse.StandardLevelRow();
                row.setId(stdId);
                row.setName(gsl.getName());
                row.setRank(gsl.getRank());
                row.setDescription(gsl.getDescription());
                return row;
            });

            if (companyMap.get(coId) == null) {
                GuideLevelGridResponse.CompanyCol col = new GuideLevelGridResponse.CompanyCol();
                col.setId(coId);
                col.setName(co.getName());
                col.setLogoUrl(co.getLogoUrl());
                col.setWebsite(co.getWebsite());
                companyMap.put(coId, col);
            }

            GuideLevelGridResponse.GridCell cell = new GuideLevelGridResponse.GridCell();
            cell.setTitle(gcl.getTitle());
            cell.setFunctionCategory(gcl.getFunctionCategory());
            cell.setOverlapPct(gm.getOverlapPct());

            grid.computeIfAbsent(stdId, k -> new LinkedHashMap<>())
                .computeIfAbsent(coId, k -> new ArrayList<>())
                .add(cell);
        }

        List<GuideLevelGridResponse.StandardLevelRow> stdRows = new ArrayList<>(stdMap.values());
        stdRows.sort(Comparator.comparingInt(GuideLevelGridResponse.StandardLevelRow::getRank));

        List<GuideLevelGridResponse.CompanyCol> cols = capped.stream()
                .map(id -> companyMap.get(id.toString()))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        GuideLevelGridResponse response = new GuideLevelGridResponse();
        response.setStandardLevels(stdRows);
        response.setCompanies(cols);
        response.setGrid(grid);
        return response;
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private GuideStandardLevelResponse toStandardResponse(GuideStandardLevel l) {
        GuideStandardLevelResponse r = new GuideStandardLevelResponse();
        r.setId(l.getId());
        r.setName(l.getName());
        r.setRank(l.getRank());
        r.setDescription(l.getDescription());
        return r;
    }

    private GuideCompanyLevelResponse toCompanyLevelResponse(GuideCompanyLevel cl) {
        GuideCompanyLevelResponse r = new GuideCompanyLevelResponse();
        r.setId(cl.getId());
        r.setCompanyId(cl.getCompany().getId());
        r.setCompanyName(cl.getCompany().getName());
        r.setTitle(cl.getTitle());
        r.setDescription(cl.getDescription());
        r.setFunctionCategory(cl.getFunctionCategory());

        List<GuideCompanyLevelResponse.MappingEntry> entries = new ArrayList<>();
        if (cl.getGuideMappings() != null) {
            cl.getGuideMappings().stream()
                .sorted(Comparator.comparingInt(m -> -m.getOverlapPct())) // highest % first
                .forEach(gm -> {
                    GuideCompanyLevelResponse.MappingEntry e = new GuideCompanyLevelResponse.MappingEntry();
                    e.setStandardLevelId(gm.getGuideStandardLevel().getId());
                    e.setStandardLevelName(gm.getGuideStandardLevel().getName());
                    e.setStandardLevelRank(gm.getGuideStandardLevel().getRank());
                    e.setOverlapPct(gm.getOverlapPct());
                    entries.add(e);
                });
        }
        r.setMappings(entries);
        return r;
    }
}
