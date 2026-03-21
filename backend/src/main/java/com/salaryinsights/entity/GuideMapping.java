package com.salaryinsights.entity;

import jakarta.persistence.*;
import jakarta.persistence.UniqueConstraint;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "guide_mappings",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_guide_mapping_co_std",
        columnNames = {"guide_company_level_id", "guide_standard_level_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class GuideMapping extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "guide_company_level_id", nullable = false)
    private GuideCompanyLevel guideCompanyLevel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "guide_standard_level_id", nullable = false)
    private GuideStandardLevel guideStandardLevel;

    /**
     * Percentage of this company level that sits at the mapped standard level.
     * All mapping rows for the same company level must sum to 100.
     * 100 = exact match. Values like 60+40 indicate the role spans two levels.
     */
    @Column(name = "overlap_pct", nullable = false)
    private Integer overlapPct = 100;
}
