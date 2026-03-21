package com.salaryinsights.entity;

import com.salaryinsights.config.JsonListConverter;
import com.salaryinsights.enums.LaunchpadRoundType;
import com.salaryinsights.enums.LaunchpadStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "launchpad_experiences")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class LaunchpadExperience extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submitted_by_id", nullable = false)
    private User submittedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    /** Denormalised company name — displayed without requiring a JOIN. */
    @Column(name = "company_name", length = 255)
    private String companyName;

    @Enumerated(EnumType.STRING)
    @Column(name = "round_type", nullable = false, length = 30)
    private LaunchpadRoundType roundType;

    @Column(name = "year")
    private Integer year;

    @Column(name = "got_offer")
    private Boolean gotOffer;

    @Column(name = "experience", columnDefinition = "TEXT", nullable = false)
    private String experience;

    /** Stored as JSON array text: ["Describe LRU Cache","Reverse a linked list"] */
    @Convert(converter = JsonListConverter.class)
    @Column(name = "questions", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> questions = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private LaunchpadStatus status = LaunchpadStatus.PENDING;

    @Column(name = "admin_note", length = 500)
    private String adminNote;

    @Builder.Default
    @Column(name = "active", nullable = false)
    private Boolean active = true;

    // search_vector column maintained by DB trigger — not mapped here
}
