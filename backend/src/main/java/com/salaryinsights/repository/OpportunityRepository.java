package com.salaryinsights.repository;

import com.salaryinsights.entity.Opportunity;
import com.salaryinsights.enums.OpportunityStatus;
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

    // ── Public browse — JOIN FETCH postedBy to avoid LazyInitializationException ──

    @Query("""
        SELECT o FROM Opportunity o
        JOIN FETCH o.postedBy
        WHERE o.status = :status
        ORDER BY o.createdAt DESC
        """)
    Slice<Opportunity> findLiveFirstPage(
            @Param("status") OpportunityStatus status,
            Pageable pageable
    );

    @Query("""
        SELECT o FROM Opportunity o
        JOIN FETCH o.postedBy
        WHERE o.status = :status
          AND o.createdAt < :cursor
        ORDER BY o.createdAt DESC
        """)
    Slice<Opportunity> findLiveNextPage(
            @Param("status") OpportunityStatus status,
            @Param("cursor") LocalDateTime cursor,
            Pageable pageable
    );

    // ── Admin queue — oldest PENDING first, JOIN FETCH postedBy ──────────────

    @Query("""
        SELECT o FROM Opportunity o
        JOIN FETCH o.postedBy
        WHERE o.status = :status
        ORDER BY o.createdAt ASC
        """)
    Page<Opportunity> findByStatusFetched(
            @Param("status") OpportunityStatus status,
            Pageable pageable
    );

    // ── Admin all — any status, JOIN FETCH postedBy ───────────────────────────

    @Query("""
        SELECT o FROM Opportunity o
        JOIN FETCH o.postedBy
        ORDER BY o.createdAt DESC
        """)
    Page<Opportunity> findAllFetched(Pageable pageable);

    // ── My posts ──────────────────────────────────────────────────────────────

    @Query("""
        SELECT o FROM Opportunity o
        JOIN FETCH o.postedBy
        WHERE o.postedBy.id = :userId
        ORDER BY o.createdAt DESC
        """)
    Page<Opportunity> findByPostedByIdFetched(
            @Param("userId") UUID userId,
            Pageable pageable
    );

    // ── Homepage counts — single GROUP BY query, no pagination ─────────────────

    @Query("""
        SELECT o.type, COUNT(o)
        FROM Opportunity o
        WHERE o.status = :status
        GROUP BY o.type
        """)
    java.util.List<Object[]> countByType(@Param("status") OpportunityStatus status);

    // ── Expiry job — bulk UPDATE, enum-safe ───────────────────────────────────

    @Modifying
    @Query("""
        UPDATE Opportunity o
        SET o.status = :expired
        WHERE o.status = :live
          AND o.expiresAt < :now
        """)
    int expireLivePastDeadline(
            @Param("live")    OpportunityStatus live,
            @Param("expired") OpportunityStatus expired,
            @Param("now")     LocalDateTime now
    );
}
