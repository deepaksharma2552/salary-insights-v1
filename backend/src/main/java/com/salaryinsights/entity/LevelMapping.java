package com.salaryinsights.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "level_mappings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class LevelMapping extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_level_id", nullable = false, unique = true)
    private CompanyLevel companyLevel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "standardized_level_id", nullable = false)
    private StandardizedLevel standardizedLevel;
}
