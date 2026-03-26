package com.salaryinsights.service.impl;

import com.salaryinsights.dto.request.FunctionLevelRequest;
import com.salaryinsights.dto.request.JobFunctionRequest;
import com.salaryinsights.dto.response.FunctionLevelResponse;
import com.salaryinsights.dto.response.JobFunctionResponse;
import com.salaryinsights.entity.FunctionLevel;
import com.salaryinsights.entity.JobFunction;
import com.salaryinsights.entity.StandardizedLevel;
import com.salaryinsights.exception.BadRequestException;
import com.salaryinsights.exception.ResourceNotFoundException;
import com.salaryinsights.repository.FunctionLevelRepository;
import com.salaryinsights.repository.JobFunctionRepository;
import com.salaryinsights.repository.StandardizedLevelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class JobFunctionService {

    private final JobFunctionRepository       functionRepo;
    private final FunctionLevelRepository     levelRepo;
    private final StandardizedLevelRepository standardizedLevelRepo;

    // ── Public read — cached ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    @Cacheable(value = "referenceData", key = "'jobFunctions'")
    public List<JobFunctionResponse> getAllFunctionsWithLevels() {
        return functionRepo.findAllWithLevels().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ── Admin: Functions ──────────────────────────────────────────────────────

    @Transactional
    @CacheEvict(value = "referenceData", key = "'jobFunctions'")
    public JobFunctionResponse createFunction(JobFunctionRequest req) {
        if (functionRepo.existsByName(req.getName().trim().toUpperCase())) {
            throw new BadRequestException("Function already exists: " + req.getName());
        }
        JobFunction jf = JobFunction.builder()
                .name(req.getName().trim().toUpperCase())
                .displayName(req.getDisplayName().trim())
                .sortOrder(req.getSortOrder())
                .build();
        return toResponse(functionRepo.save(jf));
    }

    @Transactional
    @CacheEvict(value = "referenceData", key = "'jobFunctions'")
    public JobFunctionResponse updateFunction(UUID id, JobFunctionRequest req) {
        JobFunction jf = functionRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Function not found: " + id));
        jf.setDisplayName(req.getDisplayName().trim());
        jf.setSortOrder(req.getSortOrder());
        return toResponse(functionRepo.save(jf));
    }

    @Transactional
    @CacheEvict(value = "referenceData", key = "'jobFunctions'")
    public void deleteFunction(UUID id) {
        JobFunction jf = functionRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Function not found: " + id));
        functionRepo.delete(jf);
    }

    // ── Admin: Levels ─────────────────────────────────────────────────────────

    @Transactional
    @CacheEvict(value = "referenceData", key = "'jobFunctions'")
    public FunctionLevelResponse addLevel(FunctionLevelRequest req) {
        JobFunction jf = functionRepo.findById(req.getJobFunctionId())
                .orElseThrow(() -> new ResourceNotFoundException("Function not found: " + req.getJobFunctionId()));
        if (levelRepo.existsByJobFunctionIdAndName(req.getJobFunctionId(), req.getName().trim())) {
            throw new BadRequestException("Level '" + req.getName() + "' already exists in " + jf.getDisplayName());
        }
        StandardizedLevel sl = resolveStandardizedLevel(req.getStandardizedLevelId());
        FunctionLevel fl = FunctionLevel.builder()
                .jobFunction(jf)
                .name(req.getName().trim())
                .sortOrder(req.getSortOrder())
                .standardizedLevel(sl)
                .build();
        return toLevelResponse(levelRepo.save(fl));
    }

    @Transactional
    @CacheEvict(value = "referenceData", key = "'jobFunctions'")
    public FunctionLevelResponse updateLevel(UUID id, FunctionLevelRequest req) {
        FunctionLevel fl = levelRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Level not found: " + id));
        fl.setName(req.getName().trim());
        fl.setSortOrder(req.getSortOrder());
        fl.setStandardizedLevel(resolveStandardizedLevel(req.getStandardizedLevelId()));
        return toLevelResponse(levelRepo.save(fl));
    }

    @Transactional
    @CacheEvict(value = "referenceData", key = "'jobFunctions'")
    public void deleteLevel(UUID id) {
        FunctionLevel fl = levelRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Level not found: " + id));
        levelRepo.delete(fl);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Returns the StandardizedLevel for the given UUID, or null if id is null. */
    private StandardizedLevel resolveStandardizedLevel(UUID id) {
        if (id == null) return null;
        return standardizedLevelRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Standardized level not found: " + id));
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private JobFunctionResponse toResponse(JobFunction jf) {
        JobFunctionResponse r = new JobFunctionResponse();
        r.setId(jf.getId());
        r.setName(jf.getName());
        r.setDisplayName(jf.getDisplayName());
        r.setSortOrder(jf.getSortOrder());
        r.setLevels(jf.getLevels().stream()
                .map(this::toLevelResponse)
                .collect(Collectors.toList()));
        return r;
    }

    private FunctionLevelResponse toLevelResponse(FunctionLevel fl) {
        FunctionLevelResponse r = new FunctionLevelResponse();
        r.setId(fl.getId());
        r.setName(fl.getName());
        r.setSortOrder(fl.getSortOrder());
        if (fl.getStandardizedLevel() != null) {
            r.setStandardizedLevelId(fl.getStandardizedLevel().getId());
            r.setStandardizedLevelName(fl.getStandardizedLevel().getName());
        }
        return r;
    }
}
