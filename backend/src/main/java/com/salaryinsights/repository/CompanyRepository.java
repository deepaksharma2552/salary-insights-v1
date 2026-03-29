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

    /**
     * Company listing with entry count sort support and optional hasData filter.
     *
     * sortBy values: "entries" (most approved entries first), "name" (A–Z), "recent" (most recently updated).
     * hasData: when true, only returns companies with at least 1 approved salary entry.
     *
     * Uses a LEFT JOIN subquery for entry counts so the sort is done in a single query
     * rather than N+1 enrichWithStats calls.
     */
    @Query(value =
        "SELECT c.* FROM companies c " +
        "LEFT JOIN ( " +
        "  SELECT company_id, COUNT(*) AS entry_count " +
        "  FROM salary_entries " +
        "  WHERE review_status = 'APPROVED' " +
        "  GROUP BY company_id " +
        ") ec ON ec.company_id = c.id " +
        "WHERE c.status = 'ACTIVE' " +
        "AND (:name IS NULL OR LOWER(c.name) LIKE LOWER(CONCAT('%', :name, '%'))) " +
        "AND (:industry IS NULL OR LOWER(c.industry) = LOWER(:industry)) " +
        "AND (:hasData = false OR COALESCE(ec.entry_count, 0) > 0) " +
        "ORDER BY " +
        "  CASE WHEN :sortBy = 'entries' THEN COALESCE(ec.entry_count, 0) END DESC NULLS LAST, " +
        "  CASE WHEN :sortBy = 'recent'  THEN COALESCE(c.updated_at, c.created_at) END DESC NULLS LAST, " +
        "  CASE WHEN :sortBy = 'name'    THEN c.name END ASC NULLS LAST, " +
        "  COALESCE(ec.entry_count, 0) DESC, c.name ASC",
        countQuery =
        "SELECT COUNT(*) FROM companies c " +
        "LEFT JOIN ( " +
        "  SELECT company_id, COUNT(*) AS entry_count " +
        "  FROM salary_entries WHERE review_status = 'APPROVED' GROUP BY company_id " +
        ") ec ON ec.company_id = c.id " +
        "WHERE c.status = 'ACTIVE' " +
        "AND (:name IS NULL OR LOWER(c.name) LIKE LOWER(CONCAT('%', :name, '%'))) " +
        "AND (:industry IS NULL OR LOWER(c.industry) = LOWER(:industry)) " +
        "AND (:hasData = false OR COALESCE(ec.entry_count, 0) > 0)",
        nativeQuery = true)
    Page<Company> searchCompaniesSorted(
        @Param("name")     String name,
        @Param("industry") String industry,
        @Param("sortBy")   String sortBy,
        @Param("hasData")  boolean hasData,
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
