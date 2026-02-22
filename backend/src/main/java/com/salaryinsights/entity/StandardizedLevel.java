package com.salaryinsights.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "standardized_levels")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StandardizedLevel extends BaseEntity {

    @Column(name = "name", nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "hierarchy_rank", nullable = false)
    private Integer hierarchyRank;

    @OneToMany(mappedBy = "standardizedLevel", fetch = FetchType.LAZY)
    @Builder.Default
    private List<LevelMapping> levelMappings = new ArrayList<>();
}
