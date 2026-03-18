package com.salaryinsights.service.impl;

import com.salaryinsights.dto.request.ReferralRequest;
import com.salaryinsights.dto.request.ReferralStatusRequest;
import com.salaryinsights.dto.response.PagedResponse;
import com.salaryinsights.dto.response.ReferralResponse;
import com.salaryinsights.entity.Company;
import com.salaryinsights.entity.Referral;
import com.salaryinsights.entity.User;
import com.salaryinsights.enums.ReferralStatus;
import com.salaryinsights.exception.BadRequestException;
import com.salaryinsights.exception.ResourceNotFoundException;
import com.salaryinsights.repository.CompanyRepository;
import com.salaryinsights.repository.ReferralRepository;
import com.salaryinsights.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReferralService {

    private final ReferralRepository referralRepository;
    private final UserRepository     userRepository;
    private final CompanyRepository  companyRepository;
    private final AuditLogService    auditLogService;

    // ── User-facing ────────────────────────────────────────────────────────────

    @Transactional
    public ReferralResponse submit(ReferralRequest request) {
        User caller = currentUser();

        // Resolve company — prefer ID lookup, fall back to free-text
        Company company = null;
        if (request.getCompanyId() != null) {
            company = companyRepository.findById(request.getCompanyId())
                    .orElseThrow(() -> new BadRequestException("Company not found"));
        }

        Referral referral = Referral.builder()
                .referredBy(caller)
                .candidateName(request.getCandidateName())
                .candidateEmail(request.getCandidateEmail())
                .jobTitle(request.getJobTitle())
                .company(company)
                .companyNameRaw(request.getCompanyNameRaw())
                .note(request.getNote())
                .status(ReferralStatus.PENDING)
                .build();

        referral = referralRepository.save(referral);
        log.info("Referral submitted by {} for {}", caller.getEmail(), request.getCandidateEmail());

        auditLogService.log("REFERRAL", referral.getId().toString(),
                "SUBMITTED", "Candidate: " + request.getCandidateEmail());

        return toResponse(referral);
    }

    @Transactional(readOnly = true)
    public PagedResponse<ReferralResponse> getMyReferrals(Pageable pageable) {
        User caller = currentUser();
        Page<Referral> page = referralRepository
                .findByReferredByIdOrderByCreatedAtDesc(caller.getId(), pageable);
        return PagedResponse.of(page.map(this::toResponse));
    }

    // ── Public-facing ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PagedResponse<ReferralResponse> getAcceptedReferrals(Pageable pageable) {
        return PagedResponse.of(
                referralRepository.findByStatusOrderByCreatedAtDesc(ReferralStatus.ACCEPTED, pageable)
                        .map(this::toResponse));
    }

    // ── Admin-facing ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PagedResponse<ReferralResponse> getAllReferrals(ReferralStatus statusFilter, Pageable pageable) {
        Page<Referral> page = statusFilter != null
                ? referralRepository.findByStatusOrderByCreatedAtDesc(statusFilter, pageable)
                : referralRepository.findAllByOrderByCreatedAtDesc(pageable);
        return PagedResponse.of(page.map(this::toResponse));
    }

    @Transactional
    public ReferralResponse updateStatus(UUID id, ReferralStatusRequest request) {
        Referral referral = referralRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Referral not found"));

        // Guard: only PENDING referrals can be actioned
        if (referral.getStatus() != ReferralStatus.PENDING) {
            throw new BadRequestException(
                    "Referral is already " + referral.getStatus() + " and cannot be changed");
        }

        ReferralStatus newStatus = request.getStatus();
        if (newStatus == ReferralStatus.PENDING) {
            throw new BadRequestException("Cannot set status back to PENDING");
        }

        referral.setStatus(newStatus);
        referral.setAdminNote(request.getAdminNote());
        referral = referralRepository.save(referral);

        log.info("Referral {} set to {} by admin", id, newStatus);
        auditLogService.log("REFERRAL", id.toString(),
                newStatus.name(), request.getAdminNote());

        return toResponse(referral);
    }

    // ── Mapping ────────────────────────────────────────────────────────────────

    private ReferralResponse toResponse(Referral r) {
        // Resolve display company name: prefer FK company, then free-text, then blank
        String companyName = r.getCompany() != null
                ? r.getCompany().getName()
                : (r.getCompanyNameRaw() != null ? r.getCompanyNameRaw() : "—");

        User by = r.getReferredBy();
        String referredByName = by != null
                ? (by.getFirstName() + " " + by.getLastName()).trim()
                : "—";

        return ReferralResponse.builder()
                .id(r.getId())
                .candidateName(r.getCandidateName())
                .candidateEmail(r.getCandidateEmail())
                .jobTitle(r.getJobTitle())
                .companyName(companyName)
                .note(r.getNote())
                .status(r.getStatus())
                .adminNote(r.getAdminNote())
                .referredByName(referredByName)
                .referredByEmail(by != null ? by.getEmail() : null)
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }

    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
    }
}
