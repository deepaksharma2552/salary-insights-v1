package com.salaryinsights.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "guide_company_levels",
    indexes = @Index(name = "idx_guide_co_level_company", columnList = "company_id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class GuideCompanyLevel extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "title", nullable = false, length = 100)
    private String title;

    @Column(name = "description", length = 500)
    private String description;

    // Eager mapping — always needed when displaying company levels
    @OneToOne(mappedBy = "guideCompanyLevel", cascade = CascadeType.ALL,
              orphanRemoval = true, fetch = FetchType.LAZY)
    private GuideMapping guideMapping;
}
