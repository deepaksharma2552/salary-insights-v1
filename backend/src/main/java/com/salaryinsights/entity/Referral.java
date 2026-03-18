package com.salaryinsights.entity;

import com.salaryinsights.enums.ReferralStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "referrals", indexes = {
    @Index(name = "idx_referral_user",    columnList = "referred_by_id"),
    @Index(name = "idx_referral_status",  columnList = "status"),
    @Index(name = "idx_referral_created", columnList = "created_at")
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

    /**
     * FK to companies table. Populated whether the company was pre-existing
     * or auto-created at submission time — same pattern as SalaryEntry.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    /**
     * Stores the name used at submission time so display stays correct
     * even if the company record is later renamed.
     */
    @Column(name = "company_name_raw", length = 255)
    private String companyNameRaw;

    @Column(name = "referral_link", columnDefinition = "TEXT", nullable = false)
    private String referralLink;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private ReferralStatus status = ReferralStatus.PENDING;

    /** Optional note from admin explaining a rejection. */
    @Column(name = "admin_note", length = 500)
    private String adminNote;
}
