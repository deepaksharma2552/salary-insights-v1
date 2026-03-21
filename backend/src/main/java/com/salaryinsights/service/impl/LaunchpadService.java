package com.salaryinsights.service.impl;

import com.salaryinsights.dto.request.LaunchpadExperienceRequest;
import com.salaryinsights.dto.request.LaunchpadResourceRequest;
import com.salaryinsights.dto.response.*;
import com.salaryinsights.entity.*;
import com.salaryinsights.enums.*;
import com.salaryinsights.exception.BadRequestException;
import com.salaryinsights.exception.ResourceNotFoundException;
import com.salaryinsights.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class LaunchpadService {

    private static final int PAGE_SIZE = 20;
    private static final DateTimeFormatter CURSOR_FMT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final LaunchpadResourceRepository   resourceRepo;
    private final LaunchpadExperienceRepository expRepo;
    private final CompanyRepository             companyRepo;
    private final UserRepository                userRepo;
    private final AuditLogService               auditLogService;

    // ── Resources — public ────────────────────────────────────────────────────

    /**
     * Load all active resources in one shot — dataset is admin-bounded (~200-800 items).
     * Cached for 6 hours; evicted immediately on any admin write.
     * Frontend filters client-side — zero API calls per filter change.
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "launchpadResources", key = "'all'")
    public List<LaunchpadResourceResponse> getAllActiveResources() {
        return resourceRepo.findByActiveTrueOrderByTypeAscSortOrderAsc()
                .stream().map(this::toResourceResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "launchpadCounts", key = "'stats'")
    public LaunchpadStatsResponse getStats() {
        return LaunchpadStatsResponse.builder()
                .codingProblems(resourceRepo.countByTypeAndActiveTrue(LaunchpadResourceType.CODING))
                .systemDesignQuestions(resourceRepo.countByTypeAndActiveTrue(LaunchpadResourceType.SYSTEM_DESIGN))
                .articles(resourceRepo.countByTypeAndActiveTrue(LaunchpadResourceType.ARTICLE))
                .interviewExperiences(expRepo.countByStatus(LaunchpadStatus.ACCEPTED))
                .pendingReview(expRepo.countByStatus(LaunchpadStatus.PENDING))
                .pausedExperiences(expRepo.countByStatusAndActive(LaunchpadStatus.ACCEPTED, false))
                .build();
    }

    // ── Experiences — public (cursor-based) ───────────────────────────────────

    /**
     * Public board with cursor-based pagination.
     * Hot path: first page with no filters — served from Caffeine cache.
     * All other combinations: hit DB directly (fast due to partial indexes).
     */
    @Transactional(readOnly = true)
    public CursorPage<LaunchpadExperienceResponse> getPublicExperiences(
            UUID companyId, LaunchpadRoundType roundType,
            String searchQuery, String cursorStr) {

        LocalDateTime cursor = parseCursor(cursorStr);
        PageRequest pageable = PageRequest.of(0, PAGE_SIZE);

        // Full-text search path — uses tsvector GIN index
        if (searchQuery != null && !searchQuery.isBlank() && searchQuery.length() >= 2) {
            List<LaunchpadExperience> results = expRepo.fullTextSearch(
                    searchQuery.trim(), cursor, PAGE_SIZE + 1);
            boolean hasMore = results.size() > PAGE_SIZE;
            List<LaunchpadExperience> page = hasMore ? results.subList(0, PAGE_SIZE) : results;
            String nextCursor = hasMore ? formatCursor(page.get(page.size() - 1).getCreatedAt()) : null;
            return CursorPage.<LaunchpadExperienceResponse>builder()
                    .content(page.stream().map(this::toExpResponse).collect(Collectors.toList()))
                    .nextCursor(nextCursor).hasMore(hasMore).size(page.size())
                    .build();
        }

        // Company filter
        if (companyId != null) {
            Slice<LaunchpadExperience> slice = expRepo.findPublicByCompany(companyId, cursor, pageable);
            return CursorPage.of(slice, this::toExpResponse,
                    e -> formatCursor(e.getCreatedAt()));
        }

        // Round type filter
        if (roundType != null) {
            Slice<LaunchpadExperience> slice = expRepo.findPublicByRound(roundType, cursor, pageable);
            return CursorPage.of(slice, this::toExpResponse,
                    e -> formatCursor(e.getCreatedAt()));
        }

        // No filter — hot path, cached
        return getPublicBoardFirstPage(cursor);
    }

    @Cacheable(value = "launchpadExp",
               key = "'board:' + (#cursor == null ? 'first' : #cursor.toString().substring(0,10))")
    @Transactional(readOnly = true)
    public CursorPage<LaunchpadExperienceResponse> getPublicBoardFirstPage(LocalDateTime cursor) {
        Slice<LaunchpadExperience> slice = expRepo.findPublicBoard(cursor, PageRequest.of(0, PAGE_SIZE));
        return CursorPage.of(slice, this::toExpResponse, e -> formatCursor(e.getCreatedAt()));
    }

    // ── Experiences — submit (authenticated users) ────────────────────────────

    @Transactional
    public LaunchpadExperienceResponse submitExperience(LaunchpadExperienceRequest req) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Company company = null;
        String companyName = req.getCompanyName();
        if (req.getCompanyId() != null) {
            company = companyRepo.findById(req.getCompanyId()).orElse(null);
            if (company != null) companyName = company.getName();
        }

        LaunchpadExperience exp = LaunchpadExperience.builder()
                .submittedBy(user)
                .company(company)
                .companyName(companyName)
                .roundType(req.getRoundType())
                .year(req.getYear())
                .gotOffer(req.getGotOffer())
                .experience(req.getExperience().trim())
                .questions(req.getQuestions() != null ? req.getQuestions() : new ArrayList<>())
                .build();

        exp = expRepo.save(exp);
        log.info("Experience submitted by {} for {}", email, companyName);
        return toExpResponse(exp);
    }

    // ── Resources — admin CRUD ─────────────────────────────────────────────────

    @Transactional
    @CacheEvict(value = {"launchpadResources", "launchpadCounts"}, allEntries = true)
    public LaunchpadResourceResponse createResource(LaunchpadResourceRequest req) {
        LaunchpadResource r = LaunchpadResource.builder()
                .type(req.getType())
                .title(req.getTitle().trim())
                .difficulty(req.getDifficulty())
                .topic(req.getTopic())
                .companies(req.getCompanies() != null ? req.getCompanies() : new ArrayList<>())
                .link(req.getLink())
                .description(req.getDescription())
                .sortOrder(req.getSortOrder() != null ? req.getSortOrder() : 0)
                .build();
        r = resourceRepo.save(r);
        auditLogService.log("LAUNCHPAD_RESOURCE", r.getId().toString(), "CREATED", req.getTitle());
        return toResourceResponse(r);
    }

    @Transactional
    @CacheEvict(value = {"launchpadResources", "launchpadCounts"}, allEntries = true)
    public LaunchpadResourceResponse updateResource(UUID id, LaunchpadResourceRequest req) {
        LaunchpadResource r = resourceRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found: " + id));
        r.setType(req.getType());
        r.setTitle(req.getTitle().trim());
        r.setDifficulty(req.getDifficulty());
        r.setTopic(req.getTopic());
        r.setCompanies(req.getCompanies() != null ? req.getCompanies() : new ArrayList<>());
        r.setLink(req.getLink());
        r.setDescription(req.getDescription());
        if (req.getSortOrder() != null) r.setSortOrder(req.getSortOrder());
        return toResourceResponse(resourceRepo.save(r));
    }

    @Transactional
    @CacheEvict(value = {"launchpadResources", "launchpadCounts"}, allEntries = true)
    public LaunchpadResourceResponse toggleResourceActive(UUID id) {
        LaunchpadResource r = resourceRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found: " + id));
        r.setActive(!Boolean.TRUE.equals(r.getActive()));
        return toResourceResponse(resourceRepo.save(r));
    }

    @Transactional
    @CacheEvict(value = {"launchpadResources", "launchpadCounts"}, allEntries = true)
    public void deleteResource(UUID id) {
        LaunchpadResource r = resourceRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found: " + id));
        resourceRepo.delete(r);
        auditLogService.log("LAUNCHPAD_RESOURCE", id.toString(), "DELETED", r.getTitle());
    }

    @Transactional(readOnly = true)
    public List<LaunchpadResourceResponse> getAllResourcesAdmin() {
        return resourceRepo.findAllByOrderByTypeAscSortOrderAsc()
                .stream().map(this::toResourceResponse).collect(Collectors.toList());
    }

    // ── Experiences — admin moderation ────────────────────────────────────────

    @Transactional(readOnly = true)
    public CursorPage<LaunchpadExperienceResponse> getExperiencesAdmin(
            LaunchpadStatus status, Boolean pausedOnly, String cursorStr) {
        LocalDateTime cursor = parseCursor(cursorStr);
        PageRequest pageable = PageRequest.of(0, 50);
        Slice<LaunchpadExperience> slice;
        if (Boolean.TRUE.equals(pausedOnly)) {
            slice = expRepo.findByStatusAndActiveOrderByCreatedAtDesc(
                    LaunchpadStatus.ACCEPTED, false, pageable);
        } else if (status != null) {
            slice = expRepo.findByStatusOrderByCreatedAtDesc(status, pageable);
        } else {
            slice = expRepo.findAllByOrderByCreatedAtDesc(pageable);
        }
        return CursorPage.of(slice, this::toExpResponse, e -> formatCursor(e.getCreatedAt()));
    }

    @Transactional
    @CacheEvict(value = {"launchpadExp", "launchpadCounts"}, allEntries = true)
    public LaunchpadExperienceResponse reviewExperience(UUID id, LaunchpadStatus newStatus, String adminNote) {
        LaunchpadExperience exp = expRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Experience not found: " + id));
        if (exp.getStatus() != LaunchpadStatus.PENDING) {
            throw new BadRequestException("Experience is already " + exp.getStatus());
        }
        if (newStatus == LaunchpadStatus.PENDING) {
            throw new BadRequestException("Cannot set status back to PENDING");
        }
        exp.setStatus(newStatus);
        exp.setAdminNote(adminNote);
        exp = expRepo.save(exp);
        auditLogService.log("LAUNCHPAD_EXP", id.toString(), newStatus.name(), adminNote);
        return toExpResponse(exp);
    }

    @Transactional
    @CacheEvict(value = "launchpadExp",
                key = "'board:first'")   // evict hottest cache entry on any toggle
    public LaunchpadExperienceResponse toggleExperienceActive(UUID id) {
        LaunchpadExperience exp = expRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Experience not found: " + id));
        if (exp.getStatus() != LaunchpadStatus.ACCEPTED) {
            throw new BadRequestException("Only ACCEPTED experiences can be paused/reactivated");
        }
        boolean wasActive = Boolean.TRUE.equals(exp.getActive());
        exp.setActive(!wasActive);
        exp = expRepo.save(exp);
        String action = wasActive ? "PAUSED" : "REACTIVATED";
        auditLogService.log("LAUNCHPAD_EXP", id.toString(), action, null);
        return toExpResponse(exp);
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private LaunchpadResourceResponse toResourceResponse(LaunchpadResource r) {
        return LaunchpadResourceResponse.builder()
                .id(r.getId())
                .type(r.getType())
                .title(r.getTitle())
                .difficulty(r.getDifficulty())
                .topic(r.getTopic())
                .companies(r.getCompanies() != null ? r.getCompanies() : List.of())
                .link(r.getLink())
                .description(r.getDescription())
                .active(Boolean.TRUE.equals(r.getActive()))
                .sortOrder(r.getSortOrder() != null ? r.getSortOrder() : 0)
                .createdAt(r.getCreatedAt())
                .build();
    }

    private LaunchpadExperienceResponse toExpResponse(LaunchpadExperience e) {
        String name = null;
        if (e.getSubmittedBy() != null) {
            User u = e.getSubmittedBy();
            name = (u.getFirstName() + " " + u.getLastName()).trim();
        }
        String companyName = e.getCompanyName() != null ? e.getCompanyName()
                : (e.getCompany() != null ? e.getCompany().getName() : null);
        return LaunchpadExperienceResponse.builder()
                .id(e.getId())
                .companyId(e.getCompany() != null ? e.getCompany().getId() : null)
                .companyName(companyName)
                .submittedByName(name)
                .roundType(e.getRoundType())
                .year(e.getYear())
                .gotOffer(e.getGotOffer())
                .experience(e.getExperience())
                .questions(e.getQuestions() != null ? e.getQuestions() : List.of())
                .status(e.getStatus())
                .adminNote(e.getAdminNote())
                .active(Boolean.TRUE.equals(e.getActive()))
                .createdAt(e.getCreatedAt())
                .build();
    }

    private LocalDateTime parseCursor(String cursorStr) {
        if (cursorStr == null || cursorStr.isBlank()) return null;
        try { return LocalDateTime.parse(cursorStr, CURSOR_FMT); }
        catch (Exception e) { return null; }
    }

    private String formatCursor(LocalDateTime dt) {
        return dt != null ? dt.format(CURSOR_FMT) : null;
    }
}
