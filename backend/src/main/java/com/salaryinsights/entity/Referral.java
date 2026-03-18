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

    @Column(name = "candidate_name", nullable = false, length = 200)
    private String candidateName;

    @Column(name = "candidate_email", nullable = false, length = 255)
    private String candidateEmail;

    @Column(name = "job_title", length = 200)
    private String jobTitle;

    /** Nullable — referral may be for a company not yet in the system. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    /** Free-text fallback when company is not in the system. */
    @Column(name = "company_name_raw", length = 255)
    private String companyNameRaw;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private ReferralStatus status = ReferralStatus.PENDING;

    /** Optional note from admin explaining acceptance or rejection. */
    @Column(name = "admin_note", length = 500)
    private String adminNote;
}
