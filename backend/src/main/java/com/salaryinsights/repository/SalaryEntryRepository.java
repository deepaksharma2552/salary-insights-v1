package com.salaryinsights.repository;

import com.salaryinsights.dto.response.SalaryAggregationDTO;
import com.salaryinsights.entity.SalaryEntry;
import com.salaryinsights.enums.ExperienceLevel;
import com.salaryinsights.enums.ReviewStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SalaryEntryRepository extends JpaRepository<SalaryEntry, UUID>,
        JpaSpecificationExecutor<SalaryEntry> {

    // Simple approved lookup — filtering done via Specification in SalaryService
    Page<SalaryEntry> findByReviewStatus(ReviewStatus status, Pageable pageable);

    @Query("SELECT s FROM SalaryEntry s " +
           "LEFT JOIN FETCH s.company " +
           "LEFT JOIN FETCH s.standardizedLevel " +
           "LEFT JOIN FETCH s.submittedBy " +
           "WHERE s.id = :id")
    java.util.Optional<SalaryEntry> findByIdWithDetails(@Param("id") UUID id);

    // CTE pre-computes AVG once; ORDER BY references the alias — no double aggregation
    @Query(value =
        "WITH loc_agg AS ( " +
        "  SELECT location AS groupKey, " +
        "         AVG(base_salary)         AS avgBaseSalary, " +
        "         AVG(bonus)               AS avgBonus, " +
        "         AVG(equity)              AS avgEquity, " +
        "         AVG(total_compensation)  AS avgTotalCompensation, " +
        "         COUNT(*)                 AS cnt " +
        "  FROM salary_entries " +
        "  WHERE review_status = 'APPROVED' AND location IS NOT NULL " +
        "  GROUP BY location " +
        ") " +
        "SELECT groupKey, avgBaseSalary, avgBonus, avgEquity, avgTotalCompensation, cnt FROM loc_agg " +
        "ORDER BY avgBaseSalary DESC",
        nativeQuery = true)
    List<Object[]> avgSalaryByLocationRaw();

    // Avg salary by internal level across all companies
    @Query(value =
        "WITH lvl_agg AS ( " +
        "  SELECT CASE company_internal_level " +
        "           WHEN 'SDE_1'                 THEN 'SDE 1' " +
        "           WHEN 'SDE_2'                 THEN 'SDE 2' " +
        "           WHEN 'SDE_3'                 THEN 'SDE 3' " +
        "           WHEN 'STAFF_ENGINEER'         THEN 'Staff Engineer' " +
        "           WHEN 'PRINCIPAL_ENGINEER'     THEN 'Principal Engineer' " +
        "           WHEN 'ARCHITECT'              THEN 'Architect' " +
        "           WHEN 'ENGINEERING_MANAGER'    THEN 'Engineering Manager' " +
        "           WHEN 'SR_ENGINEERING_MANAGER' THEN 'Sr. Engineering Manager' " +
        "           WHEN 'DIRECTOR'               THEN 'Director' " +
        "           WHEN 'SR_DIRECTOR'            THEN 'Sr. Director' " +
        "           WHEN 'VP'                     THEN 'VP' " +
        "           ELSE 'Unknown' " +
        "         END AS groupKey, " +
        "         AVG(base_salary)        AS avgBaseSalary, " +
        "         AVG(bonus)              AS avgBonus, " +
        "         AVG(equity)             AS avgEquity, " +
        "         AVG(total_compensation) AS avgTotalCompensation, " +
        "         COUNT(*)                AS cnt " +
        "  FROM salary_entries " +
        "  WHERE review_status = 'APPROVED' AND company_internal_level IS NOT NULL " +
        "  GROUP BY company_internal_level " +
        ") " +
        "SELECT groupKey, avgBaseSalary, avgBonus, avgEquity, avgTotalCompensation, cnt FROM lvl_agg " +
        "ORDER BY avgBaseSalary DESC",
        nativeQuery = true)
    List<Object[]> avgSalaryByInternalLevelRaw();

    // Same as above but filtered by a set of location enum values — empty list = all locations
    @Query(value =
        "WITH lvl_agg AS ( " +
        "  SELECT CASE company_internal_level " +
        "           WHEN 'SDE_1'                 THEN 'SDE 1' " +
        "           WHEN 'SDE_2'                 THEN 'SDE 2' " +
        "           WHEN 'SDE_3'                 THEN 'SDE 3' " +
        "           WHEN 'STAFF_ENGINEER'         THEN 'Staff Engineer' " +
        "           WHEN 'PRINCIPAL_ENGINEER'     THEN 'Principal Engineer' " +
        "           WHEN 'ARCHITECT'              THEN 'Architect' " +
        "           WHEN 'ENGINEERING_MANAGER'    THEN 'Engineering Manager' " +
        "           WHEN 'SR_ENGINEERING_MANAGER' THEN 'Sr. Engineering Manager' " +
        "           WHEN 'DIRECTOR'               THEN 'Director' " +
        "           WHEN 'SR_DIRECTOR'            THEN 'Sr. Director' " +
        "           WHEN 'VP'                     THEN 'VP' " +
        "           ELSE 'Unknown' " +
        "         END AS groupKey, " +
        "         AVG(base_salary)        AS avgBaseSalary, " +
        "         AVG(bonus)              AS avgBonus, " +
        "         AVG(equity)             AS avgEquity, " +
        "         AVG(total_compensation) AS avgTotalCompensation, " +
        "         COUNT(*)                AS cnt " +
        "  FROM salary_entries " +
        "  WHERE review_status = 'APPROVED' " +
        "    AND company_internal_level IS NOT NULL " +
        "    AND (COALESCE(:locations) IS NULL OR location IN (:locations)) " +
        "  GROUP BY company_internal_level " +
        ") " +
        "SELECT groupKey, avgBaseSalary, avgBonus, avgEquity, avgTotalCompensation, cnt FROM lvl_agg " +
        "ORDER BY avgBaseSalary DESC",
        nativeQuery = true)
    List<Object[]> avgSalaryByInternalLevelFilteredRaw(@Param("locations") List<String> locations);

    // CTE pre-computes AVG once; ORDER BY references the alias — no double aggregation
    @Query(value =
        "WITH co_agg AS ( " +
        "  SELECT c.name                   AS groupKey, " +
        "         AVG(s.base_salary)        AS avgBaseSalary, " +
        "         AVG(s.bonus)              AS avgBonus, " +
        "         AVG(s.equity)             AS avgEquity, " +
        "         AVG(s.total_compensation) AS avgTotalCompensation, " +
        "         COUNT(*)                  AS cnt " +
        "  FROM salary_entries s " +
        "  JOIN companies c ON s.company_id = c.id " +
        "  WHERE s.review_status = 'APPROVED' " +
        "  GROUP BY c.name " +
        ") " +
        "SELECT groupKey, avgBaseSalary, avgBonus, avgEquity, avgTotalCompensation, cnt FROM co_agg " +
        "ORDER BY avgTotalCompensation DESC",
        nativeQuery = true)
    List<Object[]> avgSalaryByCompanyRaw();

    // CTE 1: rank the 10 most-recently-active companies (COALESCE guards NULL updated_at)
    // CTE 2: aggregate levels only for those 10 companies
    // CTE 1: rank companies by weighted score = AVG(total_comp) × LOG(entry_count + 1)
    // CTE 2: aggregate per company+level, carry total company entry count for confidence badge
    // Final SELECT references pre-computed aliases — zero re-aggregation
    @Query(value =
        "WITH top_companies AS ( " +
        "  SELECT c.id AS company_id, " +
        "         c.name AS company_name, " +
        "         COUNT(*) AS total_entries, " +
        "         AVG(s.total_compensation) * LN(COUNT(*) + 1) AS weighted_score " +
        "  FROM salary_entries s " +
        "  JOIN companies c ON s.company_id = c.id " +
        "  WHERE s.review_status = 'APPROVED' " +
        "  GROUP BY c.id, c.name " +
        "  ORDER BY weighted_score DESC " +
        "  LIMIT 10 " +
        "), " +
        "level_agg AS ( " +
        "  SELECT tc.company_name, " +
        "         tc.total_entries AS company_total_entries, " +
        "         tc.weighted_score, " +
        "         CASE s.company_internal_level " +
        "           WHEN 'SDE_1'                THEN 'SDE 1' " +
        "           WHEN 'SDE_2'                THEN 'SDE 2' " +
        "           WHEN 'SDE_3'                THEN 'SDE 3' " +
        "           WHEN 'STAFF_ENGINEER'        THEN 'Staff Engineer' " +
        "           WHEN 'PRINCIPAL_ENGINEER'    THEN 'Principal Engineer' " +
        "           WHEN 'ARCHITECT'             THEN 'Architect' " +
        "           WHEN 'ENGINEERING_MANAGER'   THEN 'Engineering Manager' " +
        "           WHEN 'SR_ENGINEERING_MANAGER' THEN 'Sr. Engineering Manager' " +
        "           WHEN 'DIRECTOR'              THEN 'Director' " +
        "           WHEN 'SR_DIRECTOR'           THEN 'Sr. Director' " +
        "           WHEN 'VP'                    THEN 'VP' " +
        "           ELSE 'Unknown' " +
        "         END AS internalLevel, " +
        "         AVG(s.base_salary) AS avgBaseSalary, " +
        "         AVG(s.bonus)       AS avgBonus, " +
        "         AVG(s.equity)      AS avgEquity, " +
        "         COUNT(*)           AS cnt " +
        "  FROM salary_entries s " +
        "  JOIN top_companies tc ON s.company_id = tc.company_id " +
        "  WHERE s.review_status = 'APPROVED' AND s.company_internal_level IS NOT NULL " +
        "  GROUP BY tc.company_name, tc.total_entries, tc.weighted_score, s.company_internal_level " +
        ") " +
        "SELECT company_name, internalLevel, avgBaseSalary, avgBonus, avgEquity, cnt, company_total_entries " +
        "FROM level_agg " +
        "ORDER BY weighted_score DESC, avgBaseSalary DESC",
        nativeQuery = true)
    List<Object[]> avgSalaryByCompanyAndLevelRaw();

    long countByReviewStatus(ReviewStatus status);

    @Query("SELECT AVG(s.baseSalary) FROM SalaryEntry s WHERE s.reviewStatus = com.salaryinsights.enums.ReviewStatus.APPROVED")
    Double avgBaseSalaryApproved();

    @Query("SELECT COUNT(s) FROM SalaryEntry s WHERE s.company.id = :companyId AND s.reviewStatus = com.salaryinsights.enums.ReviewStatus.APPROVED")
    Long countApprovedByCompany(@Param("companyId") UUID companyId);

    @Query("SELECT AVG(s.baseSalary) FROM SalaryEntry s WHERE s.company.id = :companyId AND s.reviewStatus = com.salaryinsights.enums.ReviewStatus.APPROVED")
    Double avgBaseSalaryByCompany(@Param("companyId") UUID companyId);

    @Query("SELECT AVG(s.totalCompensation) FROM SalaryEntry s WHERE s.company.id = :companyId AND s.reviewStatus = com.salaryinsights.enums.ReviewStatus.APPROVED")
    Double avgTotalCompByCompany(@Param("companyId") UUID companyId);

    @Query(value = "SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as count " +
                   "FROM salary_entries WHERE created_at >= NOW() - INTERVAL '12 months' " +
                   "GROUP BY month ORDER BY month", nativeQuery = true)
    List<Object[]> submissionTrendLast12Months();

    @Query("SELECT s FROM SalaryEntry s JOIN FETCH s.company LEFT JOIN FETCH s.submittedBy " +
           "WHERE s.reviewStatus = :status")
    Page<SalaryEntry> findByReviewStatusWithDetails(@Param("status") ReviewStatus status, Pageable pageable);
}
