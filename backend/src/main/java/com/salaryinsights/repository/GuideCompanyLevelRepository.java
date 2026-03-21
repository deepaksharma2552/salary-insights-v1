package com.salaryinsights.repository;

import com.salaryinsights.entity.GuideCompanyLevel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GuideCompanyLevelRepository extends JpaRepository<GuideCompanyLevel, UUID> {

    // Fetch all levels for a company with their mappings in one query (avoids N+1)
    @Query("SELECT DISTINCT cl FROM GuideCompanyLevel cl " +
           "LEFT JOIN FETCH cl.guideMappings gm " +
           "LEFT JOIN FETCH gm.guideStandardLevel " +
           "WHERE cl.company.id = :companyId " +
           "ORDER BY cl.title ASC")
    List<GuideCompanyLevel> findByCompanyIdWithMapping(@Param("companyId") UUID companyId);

    Optional<GuideCompanyLevel> findByCompanyIdAndTitle(UUID companyId, String title);

    boolean existsByCompanyIdAndTitle(UUID companyId, String title);
}
