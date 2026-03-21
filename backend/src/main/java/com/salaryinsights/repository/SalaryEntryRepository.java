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
        "  SELECT c.name                      AS groupKey, " +
        "         CAST(c.id AS VARCHAR)        AS companyId, " +
        "         c.logo_url                  AS logoUrl, " +
        "         c.website                   AS website, " +
        "         AVG(s.base_salary)           AS avgBaseSalary, " +
        "         AVG(s.bonus)                 AS avgBonus, " +
        "         AVG(s.equity)                AS avgEquity, " +
        "         AVG(s.total_compensation)    AS avgTotalCompensation, " +
        "         COUNT(*)                     AS cnt, " +
        "         MAX(s.created_at)            AS mostRecentEntry " +
        "  FROM salary_entries s " +
        "  JOIN companies c ON s.company_id = c.id " +
        "  WHERE s.review_status = 'APPROVED' " +
        "  GROUP BY c.id, c.name, c.logo_url, c.website " +
        ") " +
        "SELECT groupKey, companyId, logoUrl, website, avgBaseSalary, avgBonus, avgEquity, avgTotalCompensation, cnt, mostRecentEntry FROM co_agg " +
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
        "         c.logo_url AS logo_url, " +
        "         c.website AS website, " +
        "         COUNT(*) AS total_entries, " +
        "         MAX(s.created_at) AS most_recent_entry, " +
        "         AVG(s.total_compensation) * LN(COUNT(*) + 1) AS weighted_score " +
        "  FROM salary_entries s " +
        "  JOIN companies c ON s.company_id = c.id " +
        "  WHERE s.review_status = 'APPROVED' " +
        "  GROUP BY c.id, c.name, c.logo_url, c.website " +
        "  ORDER BY most_recent_entry DESC " +
        "  LIMIT 5 " +
        "), " +
        "level_agg AS ( " +
        "  SELECT tc.company_name, " +
        "         CAST(tc.company_id AS VARCHAR) AS company_id_str, " +
        "         tc.logo_url, " +
        "         tc.website, " +
        "         tc.total_entries AS company_total_entries, " +
        "         tc.most_recent_entry, " +
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
        "         AVG(s.base_salary)        AS avgBaseSalary, " +
        "         AVG(s.bonus)               AS avgBonus, " +
        "         AVG(s.equity)              AS avgEquity, " +
        "         AVG(s.total_compensation)  AS avgTotalCompensation, " +
        "         COUNT(*)                   AS cnt " +
        "  FROM salary_entries s " +
        "  JOIN top_companies tc ON s.company_id = tc.company_id " +
        "  WHERE s.review_status = 'APPROVED' AND s.company_internal_level IS NOT NULL " +
        "  GROUP BY tc.company_name, tc.company_id, tc.logo_url, tc.website, tc.total_entries, tc.most_recent_entry, tc.weighted_score, s.company_internal_level " +
        ") " +
        "SELECT company_name, company_id_str, logo_url, website, internalLevel, avgBaseSalary, avgBonus, avgEquity, avgTotalCompensation, cnt, company_total_entries, most_recent_entry " +
        "FROM level_agg " +
        "ORDER BY weighted_score DESC, avgBaseSalary DESC",
        nativeQuery = true)
    List<Object[]> avgSalaryByCompanyAndLevelRaw();

    // Avg base/bonus/equity per location × internal level.
    // loc_recency CTE ranks the 5 most recently updated locations.
    // loc_lvl aggregates salary data only for those 5 locations.
    @Query(value =
        "WITH loc_recency AS ( " +
        "  SELECT location, MAX(created_at) AS most_recent_entry " +
        "  FROM salary_entries " +
        "  WHERE review_status = 'APPROVED' AND location IS NOT NULL " +
        "  GROUP BY location " +
        "  ORDER BY most_recent_entry DESC " +
        "  LIMIT 5 " +
        "), " +
        "loc_lvl AS ( " +
        "  SELECT " +
        "    s.location, " +
        "    lr.most_recent_entry, " +
        "    CASE s.company_internal_level " +
        "      WHEN 'SDE_1'                 THEN 'SDE 1' " +
        "      WHEN 'SDE_2'                 THEN 'SDE 2' " +
        "      WHEN 'SDE_3'                 THEN 'SDE 3' " +
        "      WHEN 'STAFF_ENGINEER'         THEN 'Staff Engineer' " +
        "      WHEN 'PRINCIPAL_ENGINEER'     THEN 'Principal Engineer' " +
        "      WHEN 'ARCHITECT'             THEN 'Architect' " +
        "      WHEN 'ENGINEERING_MANAGER'   THEN 'Engineering Manager' " +
        "      WHEN 'SR_ENGINEERING_MANAGER' THEN 'Sr. Engineering Manager' " +
        "      WHEN 'DIRECTOR'              THEN 'Director' " +
        "      WHEN 'SR_DIRECTOR'           THEN 'Sr. Director' " +
        "      WHEN 'VP'                    THEN 'VP' " +
        "      ELSE 'Unknown' " +
        "    END AS internalLevel, " +
        "    AVG(s.base_salary)        AS avgBaseSalary, " +
        "    AVG(s.bonus)              AS avgBonus, " +
        "    AVG(s.equity)             AS avgEquity, " +
        "    AVG(s.total_compensation) AS avgTotalCompensation, " +
        "    COUNT(*)                  AS cnt " +
        "  FROM salary_entries s " +
        "  JOIN loc_recency lr ON s.location = lr.location " +
        "  WHERE s.review_status = 'APPROVED' " +
        "    AND s.company_internal_level IS NOT NULL " +
        "  GROUP BY s.location, lr.most_recent_entry, s.company_internal_level " +
        ") " +
        "SELECT location, internalLevel, avgBaseSalary, avgBonus, avgEquity, avgTotalCompensation, cnt " +
        "FROM loc_lvl " +
        "ORDER BY most_recent_entry DESC, avgBaseSalary DESC",
        nativeQuery = true)
    List<Object[]> avgSalaryByLocationAndLevelRaw();

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

    /**
     * Weekly breakdown for a specific month.
     * Returns one row per ISO week that intersects the given month.
     * Columns: week_start (timestamp), week_num (int 1-5), count (long)
     */
    @Query(value =
        "SELECT " +
        "  DATE_TRUNC('week', created_at) AS week_start, " +
        "  EXTRACT(DAY FROM DATE_TRUNC('week', created_at) - DATE_TRUNC('month', DATE_TRUNC('week', created_at))) / 7 + 1 AS week_num, " +
        "  COUNT(*) AS count " +
        "FROM salary_entries " +
        "WHERE EXTRACT(YEAR FROM created_at) = :year " +
        "  AND EXTRACT(MONTH FROM created_at) = :month " +
        "GROUP BY week_start " +
        "ORDER BY week_start",
        nativeQuery = true)
    List<Object[]> submissionTrendWeeklyByMonth(
        @Param("year")  int year,
        @Param("month") int month);

    @Query("SELECT s FROM SalaryEntry s JOIN FETCH s.company LEFT JOIN FETCH s.submittedBy " +
           "WHERE s.reviewStatus = :status")
    Page<SalaryEntry> findByReviewStatusWithDetails(@Param("status") ReviewStatus status, Pageable pageable);

    /**
     * Location-filtered variant of avgSalaryByCompanyAndLevelRaw.
     * top_companies CTE ranks by weighted score scoped to the requested locations.
     * level_agg aggregates per company+level, also scoped to those locations.
     * Used by DashboardPage when a location filter is active.
     */
    @Query(value =
        "WITH top_companies AS ( " +
        "  SELECT c.id AS company_id, " +
        "         c.name AS company_name, " +
        "         c.logo_url AS logo_url, " +
        "         c.website AS website, " +
        "         COUNT(*) AS total_entries, " +
        "         MAX(s.created_at) AS most_recent_entry, " +
        "         AVG(s.total_compensation) * LN(COUNT(*) + 1) AS weighted_score " +
        "  FROM salary_entries s " +
        "  JOIN companies c ON s.company_id = c.id " +
        "  WHERE s.review_status = 'APPROVED' " +
        "    AND s.location IN (:locations) " +
        "  GROUP BY c.id, c.name, c.logo_url, c.website " +
        "  ORDER BY most_recent_entry DESC " +
        "  LIMIT 5 " +
        "), " +
        "level_agg AS ( " +
        "  SELECT tc.company_name, " +
        "         CAST(tc.company_id AS VARCHAR) AS company_id_str, " +
        "         tc.logo_url, " +
        "         tc.website, " +
        "         tc.total_entries AS company_total_entries, " +
        "         tc.most_recent_entry, " +
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
        "         AVG(s.base_salary)        AS avgBaseSalary, " +
        "         AVG(s.bonus)               AS avgBonus, " +
        "         AVG(s.equity)              AS avgEquity, " +
        "         AVG(s.total_compensation)  AS avgTotalCompensation, " +
        "         COUNT(*)                   AS cnt " +
        "  FROM salary_entries s " +
        "  JOIN top_companies tc ON s.company_id = tc.company_id " +
        "  WHERE s.review_status = 'APPROVED' " +
        "    AND s.company_internal_level IS NOT NULL " +
        "    AND s.location IN (:locations) " +
        "  GROUP BY tc.company_name, tc.company_id, tc.logo_url, tc.website, tc.total_entries, tc.most_recent_entry, tc.weighted_score, s.company_internal_level " +
        ") " +
        "SELECT company_name, company_id_str, logo_url, website, internalLevel, avgBaseSalary, avgBonus, avgEquity, avgTotalCompensation, cnt, company_total_entries, most_recent_entry " +
        "FROM level_agg " +
        "ORDER BY weighted_score DESC, avgBaseSalary DESC",
        nativeQuery = true)
    List<Object[]> avgSalaryByCompanyAndLevelFilteredRaw(@Param("locations") List<String> locations);

}
