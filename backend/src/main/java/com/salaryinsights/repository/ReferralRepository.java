package com.salaryinsights.repository;

import com.salaryinsights.entity.Referral;
import com.salaryinsights.enums.ReferralStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ReferralRepository extends JpaRepository<Referral, UUID> {

    /** All referrals submitted by a specific user — for "My Referrals" page. */
    Page<Referral> findByReferredByIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    /** All referrals — admin view, optionally filtered by status. */
    Page<Referral> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<Referral> findByStatusOrderByCreatedAtDesc(ReferralStatus status, Pageable pageable);

    long countByStatus(ReferralStatus status);
}
