package com.salaryinsights.entity;

import com.salaryinsights.enums.OpportunityStatus;
import com.salaryinsights.enums.OpportunityType;
import com.salaryinsights.enums.WorkMode;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "opportunities", indexes = {
    @Index(name = "idx_opp_status_created",      columnList = "status, created_at DESC"),
    @Index(name = "idx_opp_status_type_created",  columnList = "status, type, created_at DESC"),
    @Index(name = "idx_opp_status_expires",       columnList = "status, expires_at"),
    @Index(name = "idx_opp_pending",              columnList = "created_at DESC"),
    @Index(name = "idx_opp_company",              columnList = "company_id"),
    @Index(name = "idx_opp_posted_by",            columnList = "posted_by, created_at DESC"),
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Opportunity extends BaseEntity {

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "company_name", nullable = false, length = 200)
    private String companyName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private OpportunityType type;

    @Column(name = "role", length = 200)
    private String role;

    @Column(name = "location", length = 100)
    private String location;

    @Enumerated(EnumType.STRING)
    @Column(name = "work_mode", nullable = false, length = 10)
    @Builder.Default
    private WorkMode workMode = WorkMode.ONSITE;

    @Column(name = "apply_link", columnDefinition = "TEXT", nullable = false)
    private String applyLink;

    @Column(name = "stipend_or_salary", length = 100)
    private String stipendOrSalary;

    @Column(name = "experience_required", length = 100)
    private String experienceRequired;

    @Column(name = "deadline")
    private LocalDate deadline;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    @Builder.Default
    private OpportunityStatus status = OpportunityStatus.PENDING;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "posted_by", nullable = false)
    private User postedBy;

    /** Auto-set at creation: deadline (midnight) or created_at + 30 days. */
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
}
