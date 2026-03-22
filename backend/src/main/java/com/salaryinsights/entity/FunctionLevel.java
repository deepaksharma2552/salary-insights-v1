package com.salaryinsights.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "function_levels",
    indexes = @Index(name = "idx_function_level_function", columnList = "job_function_id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class FunctionLevel extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_function_id", nullable = false)
    private JobFunction jobFunction;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    /**
     * Optional mapping to the standardised InternalLevel enum.
     * Set by admin in the Job Functions page — used by SalaryService
     * to populate company_internal_level on salary submission without
     * brittle name-string matching.
     */
    @Enumerated(jakarta.persistence.EnumType.STRING)
    @Column(name = "internal_level", length = 50)
    private com.salaryinsights.enums.InternalLevel internalLevel;
}
