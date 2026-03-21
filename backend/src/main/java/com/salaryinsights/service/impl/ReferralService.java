package com.salaryinsights.service.impl;

import com.salaryinsights.dto.request.ReferralRequest;
import com.salaryinsights.dto.request.ReferralStatusRequest;
import com.salaryinsights.dto.response.PagedResponse;
import com.salaryinsights.dto.response.ReferralResponse;
import com.salaryinsights.entity.Company;
import com.salaryinsights.entity.Referral;
import com.salaryinsights.entity.User;
import com.salaryinsights.enums.CompanyStatus;
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

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReferralService {

    private static final int DEFAULT_EXPIRY_DAYS = 30;

    private final ReferralRepository referralRepository;
    private final UserRepository     userRepository;
    private final CompanyRepository  companyRepository;
    private final AuditLogService    auditLogService;

    // ── User-facing ────────────────────────────────────────────────────────────

    @Transactional
    public ReferralResponse submit(ReferralRequest request) {
        User caller = currentUser();

        // Resolve company — same pattern as SalaryService.submitSalary()
        Company company;
        if (request.getCompanyId() != null) {
            company = companyRepository.findById(request.getCompanyId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Company not found: " + request.getCompanyId()));
        } else if (request.getCompanyName() != null && !request.getCompanyName().isBlank()) {
            company = companyRepository.findByNameIgnoreCase(request.getCompanyName().trim())
                    .orElseGet(() -> {
                        Company newCompany = Company.builder()
                                .name(request.getCompanyName().trim())
                                .status(CompanyStatus.ACTIVE)
                                .build();
                        Company saved = companyRepository.save(newCompany);
                        log.info("Auto-created company during referral submission: {}", saved.getName());
                        auditLogService.log("COMPANY", saved.getId().toString(),
                                "AUTO_CREATED", "Created via referral submission by " + caller.getEmail());
                        return saved;
                    });
        } else {
            throw new BadRequestException("Either companyId or companyName must be provided");
        }

        // Default expiry to 30 days if user did not supply one
        LocalDateTime expiresAt = request.getExpiresAt() != null
                ? request.getExpiresAt()
                : LocalDateTime.now().plusDays(DEFAULT_EXPIRY_DAYS);

        Referral referral = Referral.builder()
                .referredBy(caller)
                .company(company)
                .companyNameRaw(company.getName())
                .referralLink(request.getReferralLink())
                .expiresAt(expiresAt)
                .status(ReferralStatus.PENDING)
                .build();

        referral = referralRepository.save(referral);
        log.info("Referral submitted by {} for {} (expires {})", caller.getEmail(), company.getName(), expiresAt);
        auditLogService.log("REFERRAL", referral.getId().toString(), "SUBMITTED",
                "Company: " + company.getName() + ", Expires: " + expiresAt);

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
        // Only ACCEPTED entries that have not yet expired
        return PagedResponse.of(
                referralRepository.findActiveAccepted(LocalDateTime.now(), pageable)
                        .map(this::toResponse));
    }

    // ── Admin-facing ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PagedResponse<ReferralResponse> getAllReferrals(ReferralStatus statusFilter, Boolean pausedOnly, Pageable pageable) {
        Page<Referral> page;
        if (Boolean.TRUE.equals(pausedOnly)) {
            // Paused = ACCEPTED but admin-hidden
            page = referralRepository.findByStatusAndActiveOrderByCreatedAtDesc(
                    ReferralStatus.ACCEPTED, false, pageable);
        } else if (statusFilter != null) {
            page = referralRepository.findByStatusOrderByCreatedAtDesc(statusFilter, pageable);
        } else {
            page = referralRepository.findAllByOrderByCreatedAtDesc(pageable);
        }
        return PagedResponse.of(page.map(this::toResponse));
    }

    @Transactional
    public ReferralResponse updateStatus(UUID id, ReferralStatusRequest request) {
        Referral referral = referralRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Referral not found"));

        if (referral.getStatus() != ReferralStatus.PENDING) {
            throw new BadRequestException(
                    "Referral is already " + referral.getStatus() + " and cannot be changed");
        }
        if (request.getStatus() == ReferralStatus.PENDING) {
            throw new BadRequestException("Cannot set status back to PENDING");
        }

        referral.setStatus(request.getStatus());
        referral.setAdminNote(request.getAdminNote());
        referral = referralRepository.save(referral);

        log.info("Referral {} set to {} by admin", id, request.getStatus());
        auditLogService.log("REFERRAL", id.toString(),
                request.getStatus().name(), request.getAdminNote());

        return toResponse(referral);
    }

    @Transactional
    public ReferralResponse toggleActive(UUID id) {
        Referral referral = referralRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Referral not found"));

        if (referral.getStatus() != ReferralStatus.ACCEPTED) {
            throw new BadRequestException(
                    "Only ACCEPTED referrals can be paused or reactivated (current status: " + referral.getStatus() + ")");
        }

        boolean wasActive = referral.getActive() != null ? referral.getActive() : true;
        referral.setActive(!wasActive);
        referral = referralRepository.save(referral);

        String action = wasActive ? "PAUSED" : "REACTIVATED";
        log.info("Referral {} {} by admin", id, action);
        auditLogService.log("REFERRAL", id.toString(), action, null);

        return toResponse(referral);
    }

    // ── Mapping ────────────────────────────────────────────────────────────────

    private ReferralResponse toResponse(Referral r) {
        String companyName = r.getCompanyNameRaw() != null
                ? r.getCompanyNameRaw()
                : (r.getCompany() != null ? r.getCompany().getName() : "—");

        User by = r.getReferredBy();
        String referredByName = by != null
                ? (by.getFirstName() + " " + by.getLastName()).trim()
                : "—";

        return ReferralResponse.builder()
                .id(r.getId())
                .companyId(r.getCompany() != null ? r.getCompany().getId() : null)
                .companyName(companyName)
                .website(r.getCompany() != null ? r.getCompany().getWebsite() : null)
                .referralLink(r.getReferralLink())
                .status(r.getStatus())
                .adminNote(r.getAdminNote())
                .active(r.getActive() != null ? r.getActive() : true)
                .referredByName(referredByName)
                .referredByEmail(by != null ? by.getEmail() : null)
                .expiresAt(r.getExpiresAt())
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
