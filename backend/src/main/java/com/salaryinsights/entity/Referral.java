package com.salaryinsights.entity;

import com.salaryinsights.enums.ReferralStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(name = "referrals", indexes = {
    @Index(name = "idx_referral_user",    columnList = "referred_by_id"),
    @Index(name = "idx_referral_status",  columnList = "status"),
    @Index(name = "idx_referral_created", columnList = "created_at"),
    @Index(name = "idx_referral_expires", columnList = "expires_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Referral extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "referred_by_id", nullable = false)
    private User referredBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    @Column(name = "company_name_raw", length = 255)
    private String companyNameRaw;

    @Column(name = "referral_link", columnDefinition = "TEXT", nullable = false)
    private String referralLink;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private ReferralStatus status = ReferralStatus.PENDING;

    /** Optional rejection/acceptance note from admin. */
    @Column(name = "admin_note", length = 500)
    private String adminNote;

    /**
     * When this referral link expires and is removed from the public board.
     * Defaults to 30 days from creation if not supplied by the user.
     */
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
}
