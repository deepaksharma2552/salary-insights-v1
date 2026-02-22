package com.salaryinsights.entity;

import com.salaryinsights.enums.EmploymentType;
import com.salaryinsights.enums.ExperienceLevel;
import com.salaryinsights.enums.ReviewStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

@Entity
@Table(name = "salary_entries", indexes = {
    @Index(name = "idx_salary_company", columnList = "company_id"),
    @Index(name = "idx_salary_review_status", columnList = "review_status"),
    @Index(name = "idx_salary_job_title", columnList = "job_title"),
    @Index(name = "idx_salary_location", columnList = "location"),
    @Index(name = "idx_salary_experience", columnList = "experience_level")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class SalaryEntry extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "job_title", nullable = false, length = 200)
    private String jobTitle;

    @Column(name = "department", length = 100)
    private String department;

    @Enumerated(EnumType.STRING)
    @Column(name = "experience_level", nullable = false)
    private ExperienceLevel experienceLevel;

    @Column(name = "company_internal_level", length = 100)
    private String companyInternalLevel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "standardized_level_id")
    private StandardizedLevel standardizedLevel;

    @Column(name = "location", length = 200)
    private String location;

    @Column(name = "base_salary", nullable = false, precision = 15, scale = 2)
    private BigDecimal baseSalary;

    @Column(name = "bonus", precision = 15, scale = 2)
    private BigDecimal bonus;

    @Column(name = "equity", precision = 15, scale = 2)
    private BigDecimal equity;

    @Column(name = "total_compensation", precision = 15, scale = 2)
    private BigDecimal totalCompensation;

    @Enumerated(EnumType.STRING)
    @Column(name = "employment_type", nullable = false)
    private EmploymentType employmentType;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_status", nullable = false)
    @Builder.Default
    private ReviewStatus reviewStatus = ReviewStatus.PENDING;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submitted_by_id")
    private User submittedBy;

    @PrePersist
    @PreUpdate
    private void calculateTotalCompensation() {
        BigDecimal base = baseSalary != null ? baseSalary : BigDecimal.ZERO;
        BigDecimal b = bonus != null ? bonus : BigDecimal.ZERO;
        BigDecimal e = equity != null ? equity : BigDecimal.ZERO;
        this.totalCompensation = base.add(b).add(e);
    }
}
