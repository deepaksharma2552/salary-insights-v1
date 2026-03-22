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

    private static final DateTimeFormatter CURSOR_FMT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final int DEFAULT_EXPIRY_DAYS = 30;

    // ── Post (any logged-in user) ──────────────────────────────────────────────

    @Transactional
    public OpportunityResponse post(OpportunityRequest req) {
        User poster = currentUser();

        Company company = null;
        if (req.getCompanyId() != null) {
            company = companyRepository.findById(req.getCompanyId()).orElse(null);
        }

        // Resolve expiry: use deadline midnight if set, else +30 days
        LocalDateTime expiresAt = req.getDeadline() != null
                ? req.getDeadline().atTime(23, 59, 59)
                : LocalDateTime.now().plusDays(DEFAULT_EXPIRY_DAYS);

        Opportunity opp = Opportunity.builder()
                .title(req.getTitle())
                .companyName(req.getCompanyName().trim())
                .company(company)
                .type(req.getType())
                .role(req.getRole())
                .location(req.getLocation())
                .workMode(req.getWorkMode() != null ? req.getWorkMode() : com.salaryinsights.enums.WorkMode.ONSITE)
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

    // ── Public browse — cursor-based, no COUNT on unfiltered path ─────────────

    public CursorPage<OpportunityResponse> getLive(
            String cursor,
            int size,
            String type,
            String location,
            String workMode
    ) {
        int safeSize = Math.min(size, 50);
        boolean hasFilters = type != null || location != null || workMode != null;

        if (!hasFilters) {
            PageRequest pageable = PageRequest.of(0, safeSize);
            Slice<Opportunity> slice = (cursor == null || cursor.isBlank())
                    ? opportunityRepository.findLiveFirstPage(pageable)
                    : opportunityRepository.findLiveNextPage(
                            LocalDateTime.parse(cursor, CURSOR_FMT), pageable);

            return CursorPage.of(slice, this::toResponse,
                    o -> o.getCreatedAt().format(CURSOR_FMT));
        }

        // Filtered path — Specification
        final String cursorFilter = (cursor != null && !cursor.isBlank()) ? cursor : null;
        Specification<Opportunity> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), OpportunityStatus.LIVE));
            if (cursorFilter != null)
                predicates.add(cb.lessThan(root.get("createdAt"),
                        LocalDateTime.parse(cursorFilter, CURSOR_FMT)));
            if (type != null)
                predicates.add(cb.equal(root.get("type"), OpportunityType.valueOf(type)));
            if (location != null)
                predicates.add(cb.equal(cb.lower(root.get("location")), location.toLowerCase()));
            if (workMode != null)
                predicates.add(cb.equal(root.get("workMode"),
                        com.salaryinsights.enums.WorkMode.valueOf(workMode)));
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

    public PagedResponse<OpportunityResponse> getMyPosts(int page, int size) {
        User caller = currentUser();
        Page<Opportunity> pg = opportunityRepository
                .findByPostedByIdOrderByCreatedAtDesc(
                        caller.getId(), PageRequest.of(page, size));
        return PagedResponse.of(pg.map(this::toResponse));
    }

    // ── Admin: pending queue ───────────────────────────────────────────────────

    public PagedResponse<OpportunityResponse> getPending(int page, int size) {
        Page<Opportunity> pg = opportunityRepository
                .findByStatusOrderByCreatedAtAsc(
                        OpportunityStatus.PENDING, PageRequest.of(page, size));
        return PagedResponse.of(pg.map(this::toResponse));
    }

    // ── Admin: all (any status, full filter) ──────────────────────────────────

    public PagedResponse<OpportunityResponse> getAll(
            int page, int size, String status) {
        Specification<Opportunity> spec = (root, query, cb) -> {
            if (status != null)
                return cb.equal(root.get("status"), OpportunityStatus.valueOf(status));
            return cb.conjunction();
        };
        Page<Opportunity> pg = opportunityRepository.findAll(spec,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return PagedResponse.of(pg.map(this::toResponse));
    }

    // ── Admin: update status ───────────────────────────────────────────────────

    @Transactional
    public OpportunityResponse updateStatus(UUID id, OpportunityStatusRequest req) {
        Opportunity opp = opportunityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Opportunity not found: " + id));

        if (req.getStatus() == OpportunityStatus.REJECTED
                && (req.getRejectionReason() == null || req.getRejectionReason().isBlank())) {
            throw new BadRequestException("Rejection reason is required when rejecting an opportunity");
        }

        opp.setStatus(req.getStatus());
        if (req.getRejectionReason() != null)
            opp.setRejectionReason(req.getRejectionReason().trim());

        Opportunity saved = opportunityRepository.save(opp);
        auditLogService.log("OPPORTUNITY", saved.getId().toString(),
                req.getStatus().name(), saved.getTitle());
        return toResponse(saved);
    }

    // ── Admin: delete ─────────────────────────────────────────────────────────

    @Transactional
    public void delete(UUID id) {
        Opportunity opp = opportunityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Opportunity not found: " + id));
        auditLogService.log("OPPORTUNITY", id.toString(), "DELETED", opp.getTitle());
        opportunityRepository.delete(opp);
    }

    // ── Expiry (called by OpportunityExpiryJob) ───────────────────────────────

    @Transactional
    public int expireStale() {
        int count = opportunityRepository.expireLivePastDeadline(LocalDateTime.now());
        if (count > 0) log.info("[Opportunities] Expired {} stale LIVE entries", count);
        return count;
    }

    // ── Mapper ────────────────────────────────────────────────────────────────

    private OpportunityResponse toResponse(Opportunity o) {
        return OpportunityResponse.builder()
                .id(o.getId())
                .title(o.getTitle())
                .companyName(o.getCompanyName())
                .companyId(o.getCompany() != null ? o.getCompany().getId() : null)
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
                .postedByName(o.getPostedBy() != null
                        ? o.getPostedBy().getFirstName() + " " + (o.getPostedBy().getLastName() != null ? o.getPostedBy().getLastName() : "")
                        : "Unknown")
                .postedByEmail(o.getPostedBy() != null ? o.getPostedBy().getEmail() : null)
                .expiresAt(o.getExpiresAt())
                .createdAt(o.getCreatedAt())
                .updatedAt(o.getUpdatedAt())
                .build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }
}
