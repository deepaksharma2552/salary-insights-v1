package com.salaryinsights.repository;

import com.salaryinsights.entity.Referral;
import com.salaryinsights.enums.ReferralStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.UUID;

@Repository
public interface ReferralRepository extends JpaRepository<Referral, UUID> {

    /** User's own referrals — all statuses, newest first. */
    Page<Referral> findByReferredByIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    /** Admin: all referrals unfiltered. */
    Page<Referral> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /** Admin: filtered by status. */
    Page<Referral> findByStatusOrderByCreatedAtDesc(ReferralStatus status, Pageable pageable);

    /**
     * Public board: ACCEPTED and not yet expired.
     * Only these appear on the Referral Board page.
     */
    @Query("SELECT r FROM Referral r WHERE r.status = 'ACCEPTED' AND r.expiresAt > :now ORDER BY r.createdAt DESC")
    Page<Referral> findActiveAccepted(LocalDateTime now, Pageable pageable);

    long countByStatus(ReferralStatus status);
}
