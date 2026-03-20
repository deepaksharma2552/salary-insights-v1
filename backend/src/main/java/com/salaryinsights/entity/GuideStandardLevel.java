package com.salaryinsights.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "guide_standard_levels")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class GuideStandardLevel extends BaseEntity {

    @Column(name = "name", nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "rank", nullable = false)
    private Integer rank;

    @Column(name = "description", length = 500)
    private String description;
}
