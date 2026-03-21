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

    /**
     * Job function this level belongs to — e.g. "Engineering", "Product", "Program".
     * Used to filter the public Level Guide grid by function track.
     * Defaults to "Engineering" for backward-compat with existing rows.
     */
    @Column(name = "function_category", length = 50)
    private String functionCategory;

    // 1:many mappings — a level can span multiple standard levels with overlap percentages
    @OneToMany(mappedBy = "guideCompanyLevel", cascade = CascadeType.ALL,
               orphanRemoval = true, fetch = FetchType.LAZY)
    private List<GuideMapping> guideMappings = new java.util.ArrayList<>();
}
