package com.salaryinsights.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

/**
 * Pre-aggregated daily page view counts.
 * Dashboard always reads from this — never from the raw events table.
 */
@Entity
@Table(name = "page_view_daily")
@IdClass(PageViewDailyId.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PageViewDaily {

    @Id
    @Column(name = "page", nullable = false, length = 255)
    private String page;

    @Id
    @Column(name = "date", nullable = false)
    private LocalDate date;

    @Column(name = "views", nullable = false)
    @Builder.Default
    private Long views = 0L;

    @Column(name = "unique_sessions", nullable = false)
    @Builder.Default
    private Long uniqueSessions = 0L;
}
