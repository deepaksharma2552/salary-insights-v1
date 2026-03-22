package com.salaryinsights.entity;

import com.salaryinsights.enums.CompanyLevelCategory;
import com.salaryinsights.enums.CompanyStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "companies", indexes = {
    @Index(name = "idx_company_name", columnList = "name"),
    @Index(name = "idx_company_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Company extends BaseEntity {

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "industry", length = 100)
    private String industry;

    @Column(name = "location", length = 255)
    private String location;

    @Column(name = "company_size", length = 50)
    private String companySize;

    @Enumerated(EnumType.STRING)
    @Column(name = "company_level_category")
    private CompanyLevelCategory companyLevelCategory;

    @Column(name = "website", length = 500)
    private String website;

    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private CompanyStatus status = CompanyStatus.ACTIVE;

    /** Admin-managed list of benefits sourced from the company's official benefits page. */
    @Column(name = "benefits", columnDefinition = "TEXT[]")
    @org.hibernate.annotations.Array(length = 50)
    @Builder.Default
    private String[] benefits = new String[0];

    /** Precomputed from approved salary entries — updated on new salary approval. */
    @Column(name = "tc_min", precision = 15, scale = 2)
    private java.math.BigDecimal tcMin;

    @Column(name = "tc_max", precision = 15, scale = 2)
    private java.math.BigDecimal tcMax;

    @OneToMany(mappedBy = "company", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CompanyLevel> companyLevels = new ArrayList<>();

    @OneToMany(mappedBy = "company", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @Builder.Default
    private List<SalaryEntry> salaryEntries = new ArrayList<>();
}
