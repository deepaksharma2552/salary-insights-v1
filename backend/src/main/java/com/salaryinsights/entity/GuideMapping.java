package com.salaryinsights.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "guide_mappings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class GuideMapping extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "guide_company_level_id", nullable = false, unique = true)
    private GuideCompanyLevel guideCompanyLevel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "guide_standard_level_id", nullable = false)
    private GuideStandardLevel guideStandardLevel;
}
