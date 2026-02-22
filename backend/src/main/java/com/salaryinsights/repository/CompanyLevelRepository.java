package com.salaryinsights.repository;

import com.salaryinsights.entity.CompanyLevel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CompanyLevelRepository extends JpaRepository<CompanyLevel, UUID> {

    List<CompanyLevel> findByCompanyId(UUID companyId);

    @Query("SELECT cl FROM CompanyLevel cl LEFT JOIN FETCH cl.levelMapping lm " +
           "LEFT JOIN FETCH lm.standardizedLevel WHERE cl.company.id = :companyId")
    List<CompanyLevel> findByCompanyIdWithMappings(@Param("companyId") UUID companyId);

    Optional<CompanyLevel> findByCompanyIdAndInternalLevelName(UUID companyId, String internalLevelName);
}
