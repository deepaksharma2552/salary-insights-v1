package com.salaryinsights.entity;

import com.salaryinsights.enums.ExperienceLevel;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "standardized_levels")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class StandardizedLevel extends BaseEntity {

    @Column(name = "name", nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "hierarchy_rank", nullable = false)
    private Integer hierarchyRank;

    /** Optional description of scope/responsibilities — mirrors guide_standard_levels.description */
    @Column(name = "description", length = 500)
    private String description;

    /**
     * Explicit experience tier for this level — replaces the deriveFromRank() ladder in SalaryService.
     * Set by admin when creating/editing a standardized level.
     * Null only for legacy rows; backfilled via V29 migration.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "experience_level", length = 20)
    private ExperienceLevel experienceLevel;

    @OneToMany(mappedBy = "standardizedLevel", fetch = FetchType.LAZY)
    @Builder.Default
    private List<LevelMapping> levelMappings = new ArrayList<>();
}
