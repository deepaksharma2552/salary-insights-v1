package com.salaryinsights.repository;

import com.salaryinsights.entity.Opportunity;
import com.salaryinsights.enums.OpportunityStatus;
import com.salaryinsights.enums.OpportunityType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.UUID;

@Repository
public interface OpportunityRepository
        extends JpaRepository<Opportunity, UUID>,
                JpaSpecificationExecutor<Opportunity> {

    // ── Public browse — fast keyset, no COUNT ─────────────────────────────────

    @Query("SELECT o FROM Opportunity o WHERE o.status = 'LIVE' ORDER BY o.createdAt DESC")
    Slice<Opportunity> findLiveFirstPage(Pageable pageable);

    @Query("SELECT o FROM Opportunity o WHERE o.status = 'LIVE' AND o.createdAt < :cursor ORDER BY o.createdAt DESC")
    Slice<Opportunity> findLiveNextPage(
            @Param("cursor") LocalDateTime cursor,
            Pageable pageable
    );

    // ── Admin moderation queue — pending only ─────────────────────────────────

    Page<Opportunity> findByStatusOrderByCreatedAtAsc(OpportunityStatus status, Pageable pageable);

    // ── My posts ──────────────────────────────────────────────────────────────

    Page<Opportunity> findByPostedByIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    // ── Expiry job — find LIVE rows past their expiry in batches ──────────────

    @Modifying
    @Query("""
        UPDATE Opportunity o
        SET o.status = com.salaryinsights.enums.OpportunityStatus.EXPIRED
        WHERE o.status = com.salaryinsights.enums.OpportunityStatus.LIVE
          AND o.expiresAt < :now
        """)
    int expireLivePastDeadline(@Param("now") LocalDateTime now);
}
