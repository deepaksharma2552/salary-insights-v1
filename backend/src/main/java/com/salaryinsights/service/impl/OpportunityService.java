package com.salaryinsights.service.impl;

import com.salaryinsights.dto.request.OpportunityRequest;
import com.salaryinsights.dto.request.OpportunityStatusRequest;
import com.salaryinsights.dto.response.CursorPage;
import com.salaryinsights.dto.response.OpportunityResponse;
import com.salaryinsights.dto.response.PagedResponse;
import com.salaryinsights.entity.Company;
import com.salaryinsights.entity.Opportunity;
import com.salaryinsights.entity.User;
import com.salaryinsights.enums.OpportunityStatus;
import com.salaryinsights.enums.OpportunityType;
import com.salaryinsights.enums.WorkMode;
import com.salaryinsights.exception.BadRequestException;
import com.salaryinsights.exception.ResourceNotFoundException;
import com.salaryinsights.repository.CompanyRepository;
import com.salaryinsights.repository.OpportunityRepository;
import com.salaryinsights.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class OpportunityService {

    private final OpportunityRepository opportunityRepository;
    private final CompanyRepository     companyRepository;
    private final UserRepository        userRepository;
    private final AuditLogService       auditLogService;

    private static final DateTimeFormatter CURSOR_FMT    = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final int               DEFAULT_EXPIRY = 30;

    // ── Post ──────────────────────────────────────────────────────────────────

    @Transactional
    public OpportunityResponse post(OpportunityRequest req) {
        User poster = currentUser();

        Company company = null;
        if (req.getCompanyId() != null) {
            company = companyRepository.findById(req.getCompanyId()).orElse(null);
        }

        LocalDateTime expiresAt = req.getDeadline() != null
                ? req.getDeadline().atTime(23, 59, 59)
                : LocalDateTime.now().plusDays(DEFAULT_EXPIRY);

        Opportunity opp = Opportunity.builder()
                .title(req.getTitle().trim())
                .companyName(req.getCompanyName().trim())
                .company(company)
                .type(req.getType())
                .role(req.getRole())
                .location(req.getLocation())
                .workMode(req.getWorkMode() != null ? req.getWorkMode() : WorkMode.ONSITE)
                .applyLink(req.getApplyLink().trim())
                .stipendOrSalary(req.getStipendOrSalary())
                .experienceRequired(req.getExperienceRequired())
                .deadline(req.getDeadline())
                .description(req.getDescription())
                .status(OpportunityStatus.PENDING)
                .postedBy(poster)
                .expiresAt(expiresAt)
                .build();

        Opportunity saved = opportunityRepository.save(opp);
        auditLogService.log("OPPORTUNITY", saved.getId().toString(), "SUBMITTED",
                saved.getTitle() + " — " + saved.getType());
        return toResponse(saved);
    }

    // ── Public browse — cursor-based, @Transactional so JOIN FETCH works ──────

    @Transactional(readOnly = true)
    public CursorPage<OpportunityResponse> getLive(
            String cursor, int size,
            String type, String location, String workMode) {

        int safeSize  = Math.min(size, 50);
        boolean hasFilters = type != null || location != null || workMode != null;

        if (!hasFilters) {
            // Fast path — keyset, no COUNT, JOIN FETCH already in query
            PageRequest pageable = PageRequest.of(0, safeSize);
            Slice<Opportunity> slice = (cursor == null || cursor.isBlank())
                    ? opportunityRepository.findLiveFirstPage(OpportunityStatus.LIVE, pageable)
                    : opportunityRepository.findLiveNextPage(
                            OpportunityStatus.LIVE,
                            LocalDateTime.parse(cursor, CURSOR_FMT),
                            pageable);

            return CursorPage.of(slice, this::toResponse,
                    o -> o.getCreatedAt().format(CURSOR_FMT));
        }

        // Filtered path — Specification, passes enums safely
        final String cursorFilter = (cursor != null && !cursor.isBlank()) ? cursor : null;

        Specification<Opportunity> spec = (root, query, cb) -> {
            // Eager-load postedBy and company to avoid LazyInitializationException in mapper
            root.fetch("postedBy");
            root.fetch("company", jakarta.persistence.criteria.JoinType.LEFT);
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), OpportunityStatus.LIVE));
            if (cursorFilter != null)
                predicates.add(cb.lessThan(root.get("createdAt"),
                        LocalDateTime.parse(cursorFilter, CURSOR_FMT)));
            if (type != null)
                predicates.add(cb.equal(root.get("type"), OpportunityType.valueOf(type)));
            if (location != null)
                predicates.add(cb.equal(root.get("location"), location));
            if (workMode != null)
                predicates.add(cb.equal(root.get("workMode"), WorkMode.valueOf(workMode)));
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        PageRequest pageable = PageRequest.of(0, safeSize,
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Opportunity> page = opportunityRepository.findAll(spec, pageable);

        List<OpportunityResponse> content = page.getContent().stream()
                .map(this::toResponse).toList();
        String nextCursor = (page.hasNext() && !content.isEmpty())
                ? page.getContent().get(page.getContent().size() - 1)
                        .getCreatedAt().format(CURSOR_FMT)
                : null;

        return CursorPage.<OpportunityResponse>builder()
                .content(content).nextCursor(nextCursor)
                .hasMore(page.hasNext()).size(content.size()).build();
    }

    // ── My posts ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    /**
     * Returns a map of OpportunityType → count for all LIVE opportunities.
     * Single GROUP BY query — O(types) not O(rows).
     * Used by the homepage to show accurate counts per card without N+1 fetches.
     */
    @org.springframework.cache.annotation.Cacheable(value = "analytics", key = "'opportunityCounts'")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public java.util.Map<String, Long> getCountsByType() {
        java.util.List<Object[]> rows = opportunityRepository.countByType(OpportunityStatus.LIVE);
        java.util.Map<String, Long> counts = new java.util.HashMap<>();
        for (Object[] row : rows) {
            OpportunityType type = (OpportunityType) row[0];
            Long count          = (Long) row[1];
            counts.put(type.name(), count);
        }
        return counts;
    }

    public PagedResponse<OpportunityResponse> getMyPosts(int page, int size) {
        User caller = currentUser();
        Page<Opportunity> pg = opportunityRepository.findByPostedByIdFetched(
                caller.getId(), PageRequest.of(page, size));
        return PagedResponse.of(pg.map(this::toResponse));
    }

    // ── Admin: pending queue ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PagedResponse<OpportunityResponse> getPending(int page, int size) {
        Page<Opportunity> pg = opportunityRepository.findByStatusFetched(
                OpportunityStatus.PENDING, PageRequest.of(page, size));
        return PagedResponse.of(pg.map(this::toResponse));
    }

    // ── Admin: all ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PagedResponse<OpportunityResponse> getAll(int page, int size, String status) {
        Page<Opportunity> pg;
        if (status != null) {
            pg = opportunityRepository.findByStatusFetched(
                    OpportunityStatus.valueOf(status), PageRequest.of(page, size));
        } else {
            pg = opportunityRepository.findAllFetched(
                    PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        }
        return PagedResponse.of(pg.map(this::toResponse));
    }

    // ── Admin: fix broken link and reopen ─────────────────────────────────────

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "analytics", key = "'opportunityCounts'")
    public OpportunityResponse fixAndReopen(UUID id, String newApplyLink) {
        if (newApplyLink == null || newApplyLink.isBlank())
            throw new BadRequestException("Apply link is required");
        Opportunity opp = opportunityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Opportunity not found: " + id));
        opp.setApplyLink(newApplyLink.trim());
        opp.setStatus(OpportunityStatus.LIVE);
        opp.setRejectionReason(null);
        // Reset expiry to 30 days from now so it doesn't expire immediately
        opp.setExpiresAt(LocalDateTime.now().plusDays(DEFAULT_EXPIRY));
        Opportunity saved = opportunityRepository.save(opp);
        auditLogService.log("OPPORTUNITY", saved.getId().toString(),
                "REOPENED", "Link fixed and set to LIVE: " + saved.getTitle());
        return toResponse(saved);
    }

    // ── Admin: update status ───────────────────────────────────────────────────

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "analytics", key = "'opportunityCounts'")
    public OpportunityResponse updateStatus(UUID id, OpportunityStatusRequest req) {
        Opportunity opp = opportunityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Opportunity not found: " + id));

        if (req.getStatus() == OpportunityStatus.REJECTED
                && (req.getRejectionReason() == null || req.getRejectionReason().isBlank())) {
            throw new BadRequestException("Rejection reason is required when rejecting");
        }

        opp.setStatus(req.getStatus());
        if (req.getRejectionReason() != null)
            opp.setRejectionReason(req.getRejectionReason().trim());

        Opportunity saved = opportunityRepository.save(opp);
        auditLogService.log("OPPORTUNITY", saved.getId().toString(),
                req.getStatus().name(), saved.getTitle());

        // Re-fetch with postedBy to avoid lazy load in mapper
        return toResponse(userRepository.findById(saved.getPostedBy().getId())
                .map(u -> { saved.setPostedBy(u); return saved; })
                .orElse(saved));
    }

    // ── Admin: delete ─────────────────────────────────────────────────────────

    @Transactional
    public void delete(UUID id) {
        Opportunity opp = opportunityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Opportunity not found: " + id));
        auditLogService.log("OPPORTUNITY", id.toString(), "DELETED", opp.getTitle());
        opportunityRepository.delete(opp);
    }

    // ── Expiry ────────────────────────────────────────────────────────────────

    @Transactional
    public int expireStale() {
        int count = opportunityRepository.expireLivePastDeadline(
                OpportunityStatus.LIVE, OpportunityStatus.EXPIRED, LocalDateTime.now());
        if (count > 0) log.info("[Opportunities] Expired {} stale entries", count);
        return count;
    }

    // ── Mapper — safe, all fields accessed within transaction ─────────────────

    private OpportunityResponse toResponse(Opportunity o) {
        String postedByName = "";
        String postedByEmail = "";
        if (o.getPostedBy() != null) {
            String first = o.getPostedBy().getFirstName() != null ? o.getPostedBy().getFirstName() : "";
            String last  = o.getPostedBy().getLastName()  != null ? o.getPostedBy().getLastName()  : "";
            postedByName  = (first + " " + last).trim();
            postedByEmail = o.getPostedBy().getEmail();
        }

        return OpportunityResponse.builder()
                .id(o.getId())
                .title(o.getTitle())
                .companyName(o.getCompanyName())
                .companyId(o.getCompany() != null ? o.getCompany().getId() : null)
                .logoUrl(o.getCompany() != null ? o.getCompany().getLogoUrl() : null)
                .website(o.getCompany() != null ? o.getCompany().getWebsite() : null)
                .type(o.getType())
                .role(o.getRole())
                .location(o.getLocation())
                .workMode(o.getWorkMode())
                .applyLink(o.getApplyLink())
                .stipendOrSalary(o.getStipendOrSalary())
                .experienceRequired(o.getExperienceRequired())
                .deadline(o.getDeadline())
                .description(o.getDescription())
                .status(o.getStatus())
                .rejectionReason(o.getRejectionReason())
                .postedByName(postedByName)
                .postedByEmail(postedByEmail)
                .expiresAt(o.getExpiresAt())
                .createdAt(o.getCreatedAt())
                .updatedAt(o.getUpdatedAt())
                .build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + auth.getName()));
    }
}
