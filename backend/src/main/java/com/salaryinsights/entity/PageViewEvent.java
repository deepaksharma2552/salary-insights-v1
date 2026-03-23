package com.salaryinsights.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Raw page view event — append-only, partitioned by month.
 * No PII: session_hash is SHA-256(ip + userAgent + date).
 */
@Entity
@Table(name = "page_view_events")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PageViewEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "page", nullable = false, length = 255)
    private String page;

    @Column(name = "session_hash", nullable = false, length = 64)
    private String sessionHash;

    @Column(name = "referrer", length = 500)
    private String referrer;

    @Column(name = "processed", nullable = false)
    @Builder.Default
    private Boolean processed = false;

    @Column(name = "created_at", nullable = false, updatable = false,
            columnDefinition = "TIMESTAMPTZ")
    @Builder.Default
    private OffsetDateTime createdAt = OffsetDateTime.now();
}
