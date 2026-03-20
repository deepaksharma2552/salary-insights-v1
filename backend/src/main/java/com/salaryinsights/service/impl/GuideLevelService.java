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
        // RESTRICT FK on guide_mappings prevents deletion if any company level is mapped here
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
                : "Engineering";
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
        companyLevelRepo.delete(cl); // cascade deletes mapping
    }

    // ── Mappings ──────────────────────────────────────────────────────────────

    @Transactional
    public GuideCompanyLevelResponse upsertMapping(GuideMappingRequest req) {
        GuideCompanyLevel cl = companyLevelRepo.findById(req.getGuideCompanyLevelId())
                .orElseThrow(() -> new ResourceNotFoundException("Company level not found"));
        GuideStandardLevel sl = standardRepo.findById(req.getGuideStandardLevelId())
                .orElseThrow(() -> new ResourceNotFoundException("Standard level not found"));

        GuideMapping mapping = mappingRepo.findByGuideCompanyLevelId(req.getGuideCompanyLevelId())
                .orElse(GuideMapping.builder().guideCompanyLevel(cl).build());
        mapping.setGuideStandardLevel(sl);
        mappingRepo.save(mapping);

        // Reload to get full association graph
        return toCompanyLevelResponse(
                companyLevelRepo.findByCompanyIdWithMapping(cl.getCompany().getId())
                        .stream().filter(l -> l.getId().equals(cl.getId())).findFirst()
                        .orElse(cl));
    }

    @Transactional
    public void deleteMapping(UUID guideCompanyLevelId) {
        GuideMapping mapping = mappingRepo.findByGuideCompanyLevelId(guideCompanyLevelId)
                .orElseThrow(() -> new ResourceNotFoundException("Mapping not found"));
        mappingRepo.delete(mapping);
    }

    // ── Public grid ───────────────────────────────────────────────────────────

    /**
     * Builds the comparison grid for the public Level Guide view.
     * Single DB query fetches all mappings for the requested companies,
     * then assembles into a row/column structure in memory.
     */
    @Transactional(readOnly = true)
    public GuideLevelGridResponse buildGrid(List<UUID> companyIds, String functionCategory) {
        if (companyIds == null || companyIds.isEmpty()) {
            GuideLevelGridResponse empty = new GuideLevelGridResponse();
            empty.setStandardLevels(List.of());
            empty.setCompanies(List.of());
            empty.setGrid(Map.of());
            return empty;
        }

        // Cap at 5 companies — enforced here as a safety guard
        List<UUID> capped = companyIds.size() > 5 ? companyIds.subList(0, 5) : companyIds;

        // Single JOIN query — no N+1. Filter by function if provided.
        boolean hasFunction = functionCategory != null && !functionCategory.isBlank() && !functionCategory.equalsIgnoreCase("All");
        List<GuideMapping> mappings = hasFunction
                ? mappingRepo.findByCompanyIdsAndFunction(capped, functionCategory)
                : mappingRepo.findByCompanyIds(capped);

        // Collect companies that actually have mappings, preserving request order
        Map<String, GuideLevelGridResponse.CompanyCol> companyMap = new LinkedHashMap<>();
        for (UUID id : capped) {
            // Will be filled when we encounter this company in mappings
            companyMap.put(id.toString(), null);
        }

        // Collect standard levels that have at least one mapping for selected companies
        Map<String, GuideLevelGridResponse.StandardLevelRow> stdMap = new LinkedHashMap<>();

        // grid[standardLevelId][companyId] = internal title
        Map<String, Map<String, GuideLevelGridResponse.GridCell>> grid = new LinkedHashMap<>();

        for (GuideMapping gm : mappings) {
            GuideStandardLevel gsl = gm.getGuideStandardLevel();
            GuideCompanyLevel  gcl = gm.getGuideCompanyLevel();
            Company            co  = gcl.getCompany();

            String stdId = gsl.getId().toString();
            String coId  = co.getId().toString();

            // Build standard level row entry
            stdMap.computeIfAbsent(stdId, k -> {
                GuideLevelGridResponse.StandardLevelRow row = new GuideLevelGridResponse.StandardLevelRow();
                row.setId(stdId);
                row.setName(gsl.getName());
                row.setRank(gsl.getRank());
                row.setDescription(gsl.getDescription());
                return row;
            });

            // Build company column entry
            if (companyMap.get(coId) == null) {
                GuideLevelGridResponse.CompanyCol col = new GuideLevelGridResponse.CompanyCol();
                col.setId(coId);
                col.setName(co.getName());
                col.setLogoUrl(co.getLogoUrl());
                col.setWebsite(co.getWebsite());
                companyMap.put(coId, col);
            }

            // Fill grid cell
            GuideLevelGridResponse.GridCell cell = new GuideLevelGridResponse.GridCell();
            cell.setTitle(gcl.getTitle());
            cell.setFunctionCategory(gcl.getFunctionCategory() != null ? gcl.getFunctionCategory() : "Engineering");
            grid.computeIfAbsent(stdId, k -> new LinkedHashMap<>()).put(coId, cell);
        }

        // Standard levels sorted by rank (query already orders but LinkedHashMap preserves)
        List<GuideLevelGridResponse.StandardLevelRow> stdRows = new ArrayList<>(stdMap.values());
        stdRows.sort(Comparator.comparingInt(GuideLevelGridResponse.StandardLevelRow::getRank));

        // Companies in original request order, skip any with no mappings
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
        r.setFunctionCategory(cl.getFunctionCategory() != null ? cl.getFunctionCategory() : "Engineering");
        if (cl.getGuideMapping() != null && cl.getGuideMapping().getGuideStandardLevel() != null) {
            GuideStandardLevel sl = cl.getGuideMapping().getGuideStandardLevel();
            r.setMappedStandardLevelId(sl.getId());
            r.setMappedStandardLevelName(sl.getName());
            r.setMappedStandardLevelRank(sl.getRank());
        }
        return r;
    }
}
