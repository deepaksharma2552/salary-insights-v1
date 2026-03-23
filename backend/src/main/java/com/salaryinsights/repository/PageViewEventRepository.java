package com.salaryinsights.repository;

import com.salaryinsights.entity.PageViewEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface PageViewEventRepository extends JpaRepository<PageViewEvent, UUID> {

    /** Fetch unprocessed events older than cutoff — batch for hourly job */
    @Query(value = """
        SELECT * FROM page_view_events
        WHERE processed = false
          AND created_at < :cutoff
        ORDER BY created_at
        LIMIT :limit
        """, nativeQuery = true)
    List<PageViewEvent> findUnprocessed(
            @Param("cutoff") OffsetDateTime cutoff,
            @Param("limit")  int limit
    );

    /** Bulk-mark events as processed by ID list — single UPDATE */
    @Modifying
    @Query(value = """
        UPDATE page_view_events
        SET processed = true
        WHERE id = ANY(CAST(:ids AS uuid[]))
        """, nativeQuery = true)
    void markProcessed(@Param("ids") String ids);  // comma-joined UUIDs cast to uuid[]


}
