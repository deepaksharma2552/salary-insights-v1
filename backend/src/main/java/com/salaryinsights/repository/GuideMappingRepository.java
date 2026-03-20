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
     * Public grid query — all mappings for selected companies, with full JOIN.
     * Used when no function filter is applied.
     */
    @Query("SELECT gm FROM GuideMapping gm " +
           "JOIN FETCH gm.guideStandardLevel gsl " +
           "JOIN FETCH gm.guideCompanyLevel gcl " +
           "JOIN FETCH gcl.company c " +
           "WHERE c.id IN :companyIds " +
           "ORDER BY gsl.rank ASC, c.name ASC")
    List<GuideMapping> findByCompanyIds(@Param("companyIds") List<UUID> companyIds);

    /**
     * Same as above but filtered by function category (Engineering / Product / Program).
     * Called when the user selects a specific function track on the Level Guide page.
     */
    @Query("SELECT gm FROM GuideMapping gm " +
           "JOIN FETCH gm.guideStandardLevel gsl " +
           "JOIN FETCH gm.guideCompanyLevel gcl " +
           "JOIN FETCH gcl.company c " +
           "WHERE c.id IN :companyIds " +
           "AND gcl.functionCategory = :functionCategory " +
           "ORDER BY gsl.rank ASC, c.name ASC")
    List<GuideMapping> findByCompanyIdsAndFunction(
            @Param("companyIds") List<UUID> companyIds,
            @Param("functionCategory") String functionCategory);
}
