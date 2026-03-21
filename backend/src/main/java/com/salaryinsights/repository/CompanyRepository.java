package com.salaryinsights.repository;

import com.salaryinsights.entity.Company;
import com.salaryinsights.enums.CompanyStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CompanyRepository extends JpaRepository<Company, UUID> {

    Page<Company> findByStatus(CompanyStatus status, Pageable pageable);

    @Query("SELECT c FROM Company c WHERE c.status = :status AND " +
       "(cast(:name as string) IS NULL OR LOWER(c.name) LIKE LOWER(CONCAT('%', cast(:name as string), '%'))) AND " +
       "(cast(:industry as string) IS NULL OR LOWER(c.industry) = LOWER(cast(:industry as string))) AND " +
       "(cast(:location as string) IS NULL OR LOWER(c.location) LIKE LOWER(CONCAT('%', cast(:location as string), '%')))")
    Page<Company> searchCompanies(
    @Param("status") CompanyStatus status,
    @Param("name") String name,
    @Param("industry") String industry,
    @Param("location") String location,
    Pageable pageable
);

    @Query("SELECT c FROM Company c WHERE " +
       "(cast(:name as string) IS NULL OR LOWER(c.name) LIKE LOWER(CONCAT('%', cast(:name as string), '%')))")
    Page<Company> searchAllCompanies(@Param("name") String name, Pageable pageable);

    boolean existsByName(String name);

    Optional<Company> findByNameIgnoreCase(String name);

    @Query("SELECT DISTINCT c.industry FROM Company c WHERE c.status = 'ACTIVE' ORDER BY c.industry")
    List<String> findDistinctIndustries();

    long countByStatus(CompanyStatus status);
}
