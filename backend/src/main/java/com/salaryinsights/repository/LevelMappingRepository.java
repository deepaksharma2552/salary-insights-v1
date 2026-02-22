package com.salaryinsights.repository;

import com.salaryinsights.entity.LevelMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LevelMappingRepository extends JpaRepository<LevelMapping, UUID> {

    Optional<LevelMapping> findByCompanyLevelId(UUID companyLevelId);

    @Query("SELECT lm FROM LevelMapping lm " +
           "JOIN FETCH lm.companyLevel cl " +
           "JOIN FETCH lm.standardizedLevel sl " +
           "WHERE cl.company.id = :companyId")
    List<LevelMapping> findAllByCompanyId(@Param("companyId") UUID companyId);

    @Query("SELECT lm.standardizedLevel FROM LevelMapping lm " +
           "JOIN lm.companyLevel cl " +
           "WHERE cl.company.id = :companyId AND cl.internalLevelName = :internalLevel")
    Optional<Object> resolveStandardizedLevel(
        @Param("companyId") UUID companyId,
        @Param("internalLevel") String internalLevel
    );
}
