package com.salaryinsights.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "function_levels",
    indexes = {
        @Index(name = "idx_function_level_function",  columnList = "job_function_id"),
        @Index(name = "idx_function_level_std_level", columnList = "standardized_level_id")
    })
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
     * Optional mapping to a standardized level — replaces the old InternalLevel enum field.
     * Set by admin in the Job Functions page.  Used by SalaryService on submission
     * to populate salary_entries.standardized_level_id without any name-matching hacks.
     * Null means this level has no cross-function equivalent (fine for non-Engineering roles).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "standardized_level_id")
    private StandardizedLevel standardizedLevel;

    /**
     * YOE band for DB-driven level mapping.
     * minYoe is inclusive, maxYoe is exclusive (e.g. minYoe=3, maxYoe=6 → 3 ≤ yoe < 6).
     * Null means no band configured — fallback to hardcoded ladder applies.
     */
    @Column(name = "min_yoe")
    private Integer minYoe;

    @Column(name = "max_yoe")
    private Integer maxYoe;
}
