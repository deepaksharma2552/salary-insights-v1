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
}
