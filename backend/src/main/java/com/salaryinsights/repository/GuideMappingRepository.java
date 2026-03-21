package com.salaryinsights.repository;

import com.salaryinsights.entity.GuideMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GuideMappingRepository extends JpaRepository<GuideMapping, UUID> {

    List<GuideMapping> findByGuideCompanyLevelId(UUID guideCompanyLevelId);

    @Modifying
    @Query("DELETE FROM GuideMapping gm WHERE gm.guideCompanyLevel.id = :companyLevelId")
    void deleteAllByCompanyLevelId(@Param("companyLevelId") UUID companyLevelId);

    @Query("SELECT gm FROM GuideMapping gm " +
           "JOIN FETCH gm.guideStandardLevel gsl " +
           "JOIN FETCH gm.guideCompanyLevel gcl " +
           "JOIN FETCH gcl.company c " +
           "WHERE c.id IN :companyIds " +
           "ORDER BY gsl.rank ASC, c.name ASC")
    List<GuideMapping> findByCompanyIds(@Param("companyIds") List<UUID> companyIds);

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
