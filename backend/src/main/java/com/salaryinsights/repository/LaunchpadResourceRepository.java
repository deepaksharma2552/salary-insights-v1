package com.salaryinsights.repository;

import com.salaryinsights.entity.LaunchpadResource;
import com.salaryinsights.enums.LaunchpadDifficulty;
import com.salaryinsights.enums.LaunchpadResourceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LaunchpadResourceRepository extends JpaRepository<LaunchpadResource, UUID> {

    /** All active resources of a given type, ordered for display. */
    List<LaunchpadResource> findByTypeAndActiveTrueOrderBySortOrderAscCreatedAtAsc(LaunchpadResourceType type);

    /** All active resources regardless of type (used to load-all into frontend context). */
    List<LaunchpadResource> findByActiveTrueOrderByTypeAscSortOrderAsc();

    /** Admin: all resources including inactive, newest first. */
    List<LaunchpadResource> findAllByOrderByTypeAscSortOrderAsc();

    /** Count stats for the landing page. */
    long countByTypeAndActiveTrue(LaunchpadResourceType type);
    long countByActive(boolean active);
}
