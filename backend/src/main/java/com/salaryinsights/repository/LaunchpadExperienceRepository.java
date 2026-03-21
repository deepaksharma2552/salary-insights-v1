package com.salaryinsights.repository;

import com.salaryinsights.entity.LaunchpadExperience;
import com.salaryinsights.enums.LaunchpadRoundType;
import com.salaryinsights.enums.LaunchpadStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface LaunchpadExperienceRepository extends JpaRepository<LaunchpadExperience, UUID> {

    /**
     * Public board — cursor-based (keyset) pagination.
     * Replaces OFFSET with a WHERE clause on created_at — constant O(log n) time
     * regardless of how deep the user pages, even at 50,000+ records.
     * cursor = null means first page (no lower bound).
     */
    @Query("SELECT e FROM LaunchpadExperience e " +
           "WHERE e.status = 'ACCEPTED' AND e.active = true " +
           "AND (:cursor IS NULL OR e.createdAt < :cursor) " +
           "ORDER BY e.createdAt DESC")
    Slice<LaunchpadExperience> findPublicBoard(
            @Param("cursor") LocalDateTime cursor, Pageable pageable);

    @Query("SELECT e FROM LaunchpadExperience e " +
           "WHERE e.status = 'ACCEPTED' AND e.active = true " +
           "AND e.company.id = :companyId " +
           "AND (:cursor IS NULL OR e.createdAt < :cursor) " +
           "ORDER BY e.createdAt DESC")
    Slice<LaunchpadExperience> findPublicByCompany(
            @Param("companyId") UUID companyId,
            @Param("cursor") LocalDateTime cursor, Pageable pageable);

    @Query("SELECT e FROM LaunchpadExperience e " +
           "WHERE e.status = 'ACCEPTED' AND e.active = true " +
           "AND e.roundType = :roundType " +
           "AND (:cursor IS NULL OR e.createdAt < :cursor) " +
           "ORDER BY e.createdAt DESC")
    Slice<LaunchpadExperience> findPublicByRound(
            @Param("roundType") LaunchpadRoundType roundType,
            @Param("cursor") LocalDateTime cursor, Pageable pageable);

    /**
     * Full-text search — uses the tsvector GIN index maintained by DB trigger.
     * Returns constant-time results at any data volume.
     */
    @Query(value =
        "SELECT * FROM launchpad_experiences " +
        "WHERE status = 'ACCEPTED' AND active = true " +
        "AND search_vector @@ plainto_tsquery('english', :query) " +
        "AND (:cursor IS NULL OR created_at < :cursor) " +
        "ORDER BY created_at DESC LIMIT :limit",
        nativeQuery = true)
    List<LaunchpadExperience> fullTextSearch(
            @Param("query")  String query,
            @Param("cursor") LocalDateTime cursor,
            @Param("limit")  int limit);

    /** User's own submissions. */
    Slice<LaunchpadExperience> findBySubmittedByIdOrderByCreatedAtDesc(
            UUID userId, Pageable pageable);

    /** Admin moderation queue. */
    Slice<LaunchpadExperience> findByStatusOrderByCreatedAtDesc(
            LaunchpadStatus status, Pageable pageable);

    /** Admin all, newest first. */
    Slice<LaunchpadExperience> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /** Paused: accepted but hidden. */
    Slice<LaunchpadExperience> findByStatusAndActiveOrderByCreatedAtDesc(
            LaunchpadStatus status, boolean active, Pageable pageable);

    long countByStatus(LaunchpadStatus status);
    long countByStatusAndActive(LaunchpadStatus status, boolean active);
}
