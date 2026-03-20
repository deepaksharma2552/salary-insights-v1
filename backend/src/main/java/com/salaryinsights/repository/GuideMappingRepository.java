package com.salaryinsights.repository;

import com.salaryinsights.entity.GuideMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GuideMappingRepository extends JpaRepository<GuideMapping, UUID> {

    Optional<GuideMapping> findByGuideCompanyLevelId(UUID guideCompanyLevelId);

    /**
     * Public grid query — for a set of company IDs, fetch all mappings with
     * their standard level and company info in a single JOIN.
     * Result used to build the comparison grid on the frontend.
     */
    @Query("SELECT gm FROM GuideMapping gm " +
           "JOIN FETCH gm.guideStandardLevel gsl " +
           "JOIN FETCH gm.guideCompanyLevel gcl " +
           "JOIN FETCH gcl.company c " +
           "WHERE c.id IN :companyIds " +
           "ORDER BY gsl.rank ASC, c.name ASC")
    List<GuideMapping> findByCompanyIds(@Param("companyIds") List<UUID> companyIds);
}
