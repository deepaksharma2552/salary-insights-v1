package com.salaryinsights.entity;

import com.salaryinsights.config.JsonListConverter;
import com.salaryinsights.enums.LaunchpadDifficulty;
import com.salaryinsights.enums.LaunchpadResourceType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "launchpad_resources")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class LaunchpadResource extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private LaunchpadResourceType type;

    @Column(name = "title", nullable = false, length = 300)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "difficulty", length = 10)
    private LaunchpadDifficulty difficulty;

    @Column(name = "topic", length = 100)
    private String topic;

    /** Stored as JSON array text: ["Google","Amazon","Flipkart"] */
    @Convert(converter = JsonListConverter.class)
    @Column(name = "companies", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> companies = new ArrayList<>();

    @Column(name = "link", columnDefinition = "TEXT")
    private String link;

    @Column(name = "description", length = 1000)
    private String description;

    @Builder.Default
    @Column(name = "active", nullable = false)
    private Boolean active = true;

    @Builder.Default
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;
}
