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

    Page<SalaryEntry> findByReviewStatus(ReviewStatus status, Pageable pageable);

    /**
     * Returns the most recent salary entry sharing a given AI fingerprint.
     * Used by the dedup logic in AiSalaryEnrichmentService to compare against
     * the latest known observation for a given role/level/location combination.
     */
    java.util.Optional<SalaryEntry> findTopByAiFingerprintOrderByCreatedAtDesc(String aiFingerprint);

    @Query("SELECT s FROM SalaryEntry s JOIN FETCH s.company LEFT JOIN FETCH s.submittedBy " +
           "WHERE s.submittedBy.email = :email " +
           "ORDER BY s.createdAt DESC")
    Page<SalaryEntry> findBySubmittedByEmail(@Param("email") String email, Pageable pageable);

    @Query("SELECT s FROM SalaryEntry s " +
           "LEFT JOIN FETCH s.company " +
           "LEFT JOIN FETCH s.standardizedLevel " +
           "LEFT JOIN FETCH s.submittedBy " +
           "WHERE s.id = :id")
    java.util.Optional<SalaryEntry> findByIdWithDetails(@Param("id") UUID id);

    // Avg salary by location — unchanged, locations are still an enum
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

    // Avg salary by standardized level — JOIN replaces the old CASE enum block.
    // groupKey is now sl.name (e.g. "SDE 2"), ordered by hierarchy_rank for consistent display.
    @Query(value =
        "SELECT sl.name                    AS groupKey, " +
        "       AVG(se.base_salary)        AS avgBaseSalary, " +
        "       AVG(se.bonus)              AS avgBonus, " +
        "       AVG(se.equity)             AS avgEquity, " +
        "       AVG(se.total_compensation) AS avgTotalCompensation, " +
        "       COUNT(*)                   AS cnt " +
        "FROM salary_entries se " +
        "JOIN standardized_levels sl ON sl.id = se.standardized_level_id " +
        "WHERE se.review_status = 'APPROVED' " +
        "GROUP BY sl.id, sl.name, sl.hierarchy_rank " +
        "ORDER BY sl.hierarchy_rank ASC",
        nativeQuery = true)
    List<Object[]> avgSalaryByInternalLevelRaw();

    // Avg total compensation grouped by years_of_experience — unchanged
    @Query(value =
        "SELECT years_of_experience                AS yoe, " +
        "       AVG(base_salary)                   AS avgBaseSalary, " +
        "       AVG(bonus)                         AS avgBonus, " +
        "       AVG(equity)                        AS avgEquity, " +
        "       AVG(total_compensation)             AS avgTotalComp, " +
        "       COUNT(*)                           AS cnt " +
        "FROM salary_entries " +
        "WHERE review_status = 'APPROVED' " +
        "  AND years_of_experience IS NOT NULL " +
        "  AND years_of_experience BETWEEN 0 AND 25 " +
        "GROUP BY years_of_experience " +
        "ORDER BY years_of_experience ASC",
        nativeQuery = true)
    List<Object[]> avgSalaryByYoeRaw();

    // Location-filtered variant of avgSalaryByInternalLevelRaw
    @Query(value =
        "SELECT sl.name                    AS groupKey, " +
        "       AVG(se.base_salary)        AS avgBaseSalary, " +
        "       AVG(se.bonus)              AS avgBonus, " +
        "       AVG(se.equity)             AS avgEquity, " +
        "       AVG(se.total_compensation) AS avgTotalCompensation, " +
        "       COUNT(*)                   AS cnt " +
        "FROM salary_entries se " +
        "JOIN standardized_levels sl ON sl.id = se.standardized_level_id " +
        "WHERE se.review_status = 'APPROVED' " +
        "  AND (COALESCE(:locations) IS NULL OR se.location IN (:locations)) " +
        "GROUP BY sl.id, sl.name, sl.hierarchy_rank " +
        "ORDER BY sl.hierarchy_rank ASC",
        nativeQuery = true)
    List<Object[]> avgSalaryByInternalLevelFilteredRaw(@Param("locations") List<String> locations);

    // Avg salary by company — unchanged
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

    // Avg salary by company + standardized level (top 5 companies by weighted score).
    // CASE block removed — JOIN to standardized_levels returns sl.name directly.
    // ORDER BY sl.hierarchy_rank gives consistent level ordering within each company.
    // Note: function_levels.sort_order is intentionally NOT used here — it is a
    // per-function relative rank (1, 2, 3...) and is not globally comparable across
    // entries that mix function-level-linked and non-linked rows. standardized_levels
    // .hierarchy_rank (10, 20, 30...) is the single global sort key.
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
        "  LIMIT 20 " +
        "), " +
        "level_agg AS ( " +
        "  SELECT tc.company_name, " +
        "         CAST(tc.company_id AS VARCHAR) AS company_id_str, " +
        "         tc.logo_url, " +
        "         tc.website, " +
        "         tc.total_entries AS company_total_entries, " +
        "         tc.most_recent_entry, " +
        "         tc.weighted_score, " +
        "         sl.name AS internalLevel, " +
        "         sl.hierarchy_rank, " +
        "         AVG(s.base_salary)        AS avgBaseSalary, " +
        "         AVG(s.bonus)              AS avgBonus, " +
        "         AVG(s.equity)             AS avgEquity, " +
        "         AVG(s.total_compensation) AS avgTotalCompensation, " +
        "         COUNT(*)                  AS cnt " +
        "  FROM salary_entries s " +
        "  JOIN top_companies tc ON s.company_id = tc.company_id " +
        "  JOIN standardized_levels sl ON sl.id = s.standardized_level_id " +
        "  WHERE s.review_status = 'APPROVED' " +
        "  GROUP BY tc.company_name, tc.company_id, tc.logo_url, tc.website, " +
        "           tc.total_entries, tc.most_recent_entry, tc.weighted_score, " +
        "           sl.id, sl.name, sl.hierarchy_rank " +
        ") " +
        "SELECT company_name, company_id_str, logo_url, website, internalLevel, " +
        "       avgBaseSalary, avgBonus, avgEquity, avgTotalCompensation, cnt, " +
        "       company_total_entries, most_recent_entry, hierarchy_rank " +
        "FROM level_agg " +
        "ORDER BY weighted_score DESC, hierarchy_rank ASC",
        nativeQuery = true)
    List<Object[]> avgSalaryByCompanyAndLevelRaw();

    // Avg salary by location × function level (top 20 most-recent locations).
    // Groups by function_level_id first (the function-specific ladder name, e.g.
    // "Staff Engineer", "Sr. Program Manager") with a COALESCE fallback to
    // standardized_levels.name for legacy entries that have no function_level_id.
    // This prevents a single "Staff Engineer" entry from appearing as "SDE 1" /
    // "SDE 2" etc. because its standardized_level_id happened to map there.
    // Ordering: function levels use fl.sort_order; fallback rows use sl.hierarchy_rank.
    @Query(value =
        "WITH loc_recency AS ( " +
        "  SELECT location, MAX(created_at) AS most_recent_entry " +
        "  FROM salary_entries " +
        "  WHERE review_status = 'APPROVED' AND location IS NOT NULL " +
        "  GROUP BY location " +
        "  ORDER BY most_recent_entry DESC " +
        "  LIMIT 20 " +
        "), " +
        "loc_lvl AS ( " +
        "  SELECT " +
        "    s.location, " +
        "    lr.most_recent_entry, " +
        "    COALESCE(fl.name, sl.name)              AS internalLevel, " +
        "    COALESCE(fl.sort_order, sl.hierarchy_rank) AS hierarchy_rank, " +
        "    AVG(s.base_salary)        AS avgBaseSalary, " +
        "    AVG(s.bonus)              AS avgBonus, " +
        "    AVG(s.equity)             AS avgEquity, " +
        "    AVG(s.total_compensation) AS avgTotalCompensation, " +
        "    COUNT(*)                  AS cnt " +
        "  FROM salary_entries s " +
        "  JOIN loc_recency lr ON s.location = lr.location " +
        "  LEFT JOIN function_levels fl ON fl.id = s.function_level_id " +
        "  LEFT JOIN standardized_levels sl ON sl.id = s.standardized_level_id " +
        "  WHERE s.review_status = 'APPROVED' " +
        "    AND (s.function_level_id IS NOT NULL OR s.standardized_level_id IS NOT NULL) " +
        "  GROUP BY s.location, lr.most_recent_entry, " +
        "           COALESCE(fl.name, sl.name), " +
        "           COALESCE(fl.sort_order, sl.hierarchy_rank) " +
        ") " +
        "SELECT location, internalLevel, avgBaseSalary, avgBonus, avgEquity, avgTotalCompensation, cnt, hierarchy_rank " +
        "FROM loc_lvl " +
        "ORDER BY most_recent_entry DESC, hierarchy_rank ASC",
        nativeQuery = true)
    List<Object[]> avgSalaryByLocationAndLevelRaw();

    @Query(value = "SELECT COUNT(*) FROM salary_entries WHERE review_status = 'APPROVED' AND created_at >= DATE_TRUNC('month', NOW())", nativeQuery = true)
    Long countApprovedThisMonth();

    long countByReviewStatus(ReviewStatus status);

    long countByCreatedAtAfterAndReviewStatus(java.time.LocalDateTime after, ReviewStatus status);

    long countByCreatedAtBetweenAndReviewStatus(java.time.LocalDateTime start, java.time.LocalDateTime end, ReviewStatus status);

    @Query("SELECT AVG(s.baseSalary) FROM SalaryEntry s WHERE s.reviewStatus = com.salaryinsights.enums.ReviewStatus.APPROVED")
    Double avgBaseSalaryApproved();

    @Query("SELECT COUNT(s) FROM SalaryEntry s WHERE s.company.id = :companyId AND s.reviewStatus = com.salaryinsights.enums.ReviewStatus.APPROVED")
    Long countApprovedByCompany(@Param("companyId") UUID companyId);

    @Query("SELECT AVG(s.baseSalary) FROM SalaryEntry s WHERE s.company.id = :companyId AND s.reviewStatus = com.salaryinsights.enums.ReviewStatus.APPROVED")
    Double avgBaseSalaryByCompany(@Param("companyId") UUID companyId);

    @Query("SELECT AVG(s.totalCompensation) FROM SalaryEntry s WHERE s.company.id = :companyId AND s.reviewStatus = com.salaryinsights.enums.ReviewStatus.APPROVED")
    Double avgTotalCompByCompany(@Param("companyId") UUID companyId);

    @Query("SELECT MIN(s.totalCompensation) FROM SalaryEntry s WHERE s.company.id = :companyId AND s.reviewStatus = com.salaryinsights.enums.ReviewStatus.APPROVED AND s.totalCompensation IS NOT NULL")
    java.math.BigDecimal minTCByCompany(@Param("companyId") UUID companyId);

    @Query("SELECT MAX(s.totalCompensation) FROM SalaryEntry s WHERE s.company.id = :companyId AND s.reviewStatus = com.salaryinsights.enums.ReviewStatus.APPROVED AND s.totalCompensation IS NOT NULL")
    java.math.BigDecimal maxTCByCompany(@Param("companyId") UUID companyId);

    // Salary summary by function + level for a single company.
    // Returns one row per (job_function, function_level) pair so the frontend
    // can group by function and show a chip-based breakdown.
    // Display label priority:
    //   1. function_levels.name  (e.g. "Sr. Product Manager", "Senior Designer")
    //   2. standardized_levels.name fallback (e.g. "Senior") for entries without a function level
    //   3. experience_level enum fallback for legacy entries with neither
    // Ordering uses sl.hierarchy_rank so levels always sort junior → senior regardless of function.
    @Query(value =
        "SELECT COALESCE(jf.display_name, 'Other')                                                      AS functionName, " +
        "       COALESCE(fl.name, sl.name, INITCAP(LOWER(s.experience_level)), 'Other')                 AS internalLevel, " +
        "       AVG(s.base_salary)                                                                       AS avgBase, " +
        "       AVG(s.bonus)                                                                             AS avgBonus, " +
        "       AVG(s.equity)                                                                            AS avgEquity, " +
        "       AVG(s.total_compensation)                                                                AS avgTC, " +
        "       COUNT(*)                                                                                 AS cnt, " +
        "       MIN(COALESCE(fl.sort_order, sl.hierarchy_rank, 99))                                     AS levelRank, " +
        "       MIN(COALESCE(jf.sort_order, 99))                                                        AS fnRank " +
        "FROM salary_entries s " +
        "LEFT JOIN function_levels fl     ON fl.id = s.function_level_id " +
        "LEFT JOIN standardized_levels sl ON sl.id = s.standardized_level_id " +
        "LEFT JOIN job_functions jf       ON jf.id = s.job_function_id " +
        "WHERE s.company_id = CAST(:companyId AS uuid) " +
        "  AND s.review_status = 'APPROVED' " +
        "GROUP BY COALESCE(jf.display_name, 'Other'), " +
        "         COALESCE(fl.name, sl.name, INITCAP(LOWER(s.experience_level)), 'Other') " +
        "ORDER BY MIN(COALESCE(jf.sort_order, 99)) ASC, MIN(COALESCE(fl.sort_order, sl.hierarchy_rank, 99)) ASC",
        nativeQuery = true)
    List<Object[]> salarySummaryByLevel(@Param("companyId") UUID companyId);

    // Salary Benchmarker — unchanged, already uses function_level_id FK
    @Query(value =
        "SELECT " +
        "  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY total_compensation) AS p25_tc, " +
        "  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY total_compensation) AS p50_tc, " +
        "  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY total_compensation) AS p75_tc, " +
        "  AVG(total_compensation)                                           AS avg_tc, " +
        "  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY base_salary)        AS p25_base, " +
        "  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY base_salary)        AS p50_base, " +
        "  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY base_salary)        AS p75_base, " +
        "  AVG(base_salary)                                                  AS avg_base, " +
        "  AVG(bonus)                                                        AS avg_bonus, " +
        "  AVG(equity)                                                       AS avg_equity, " +
        "  COUNT(*)                                                          AS cnt " +
        "FROM salary_entries s " +
        "WHERE s.review_status = 'APPROVED' " +
        "  AND (:jobTitle IS NULL OR LOWER(s.job_title) LIKE LOWER(CONCAT('%', :jobTitle, '%'))) " +
        "  AND (:jobFunctionId IS NULL OR s.job_function_id = CAST(:jobFunctionId AS uuid)) " +
        "  AND (:functionLevelId IS NULL OR s.function_level_id = CAST(:functionLevelId AS uuid)) " +
        "  AND (:location IS NULL OR s.location = :location) ",
        nativeQuery = true)
    List<Object[]> benchmarkRaw(
        @Param("jobTitle")        String jobTitle,
        @Param("jobFunctionId")   String jobFunctionId,
        @Param("functionLevelId") String functionLevelId,
        @Param("location")        String location
    );

    // Salary Trends — unchanged
    @Query(value =
        "WITH windows AS ( " +
        "  SELECT " +
        "    CAST(c.id AS VARCHAR)                                               AS company_id, " +
        "    c.name                                                              AS company_name, " +
        "    AVG(CASE WHEN s.created_at >= NOW() - INTERVAL '6 months' " +
        "             THEN s.total_compensation END)                             AS recent_avg_tc, " +
        "    AVG(CASE WHEN s.created_at >= NOW() - INTERVAL '12 months' " +
        "              AND s.created_at <  NOW() - INTERVAL '6 months' " +
        "             THEN s.total_compensation END)                             AS prior_avg_tc, " +
        "    COUNT(CASE WHEN s.created_at >= NOW() - INTERVAL '6 months' " +
        "              THEN 1 END)                                               AS recent_count, " +
        "    COUNT(CASE WHEN s.created_at >= NOW() - INTERVAL '12 months' " +
        "               AND s.created_at <  NOW() - INTERVAL '6 months' " +
        "              THEN 1 END)                                               AS prior_count " +
        "  FROM salary_entries s " +
        "  JOIN companies c ON s.company_id = c.id " +
        "  WHERE s.review_status = 'APPROVED' " +
        "    AND s.created_at   >= NOW() - INTERVAL '12 months' " +
        "  GROUP BY c.id, c.name " +
        "  HAVING COUNT(CASE WHEN s.created_at >= NOW() - INTERVAL '6 months' THEN 1 END) > 0 " +
        ") " +
        "SELECT company_id, company_name, recent_avg_tc, prior_avg_tc, recent_count, prior_count " +
        "FROM windows " +
        "ORDER BY recent_avg_tc DESC NULLS LAST",
        nativeQuery = true)
    List<Object[]> salaryTrendsRaw();

    // Top N companies by approved submission count — used by admin dashboard Company Overview card
    @Query(value =
        "SELECT c.name AS companyName, COUNT(*) AS submissionCount " +
        "FROM salary_entries s " +
        "JOIN companies c ON s.company_id = c.id " +
        "WHERE s.review_status = 'APPROVED' " +
        "GROUP BY c.id, c.name " +
        "ORDER BY submissionCount DESC " +
        "LIMIT :limit",
        nativeQuery = true)
    List<Object[]> topCompaniesBySubmissions(@Param("limit") int limit);

    @Query(value = "SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as count " +
                   "FROM salary_entries WHERE created_at >= NOW() - INTERVAL '12 months' " +
                   "GROUP BY month ORDER BY month", nativeQuery = true)
    List<Object[]> submissionTrendLast12Months();

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
    List<Object[]> submissionTrendWeeklyByMonth(@Param("year") int year, @Param("month") int month);

    @Query("SELECT s FROM SalaryEntry s JOIN FETCH s.company LEFT JOIN FETCH s.submittedBy " +
           "WHERE s.reviewStatus = :status")
    Page<SalaryEntry> findByReviewStatusWithDetails(@Param("status") ReviewStatus status, Pageable pageable);

    // Location-filtered variant of avgSalaryByCompanyAndLevelRaw
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
        "  LIMIT 20 " +
        "), " +
        "level_agg AS ( " +
        "  SELECT tc.company_name, " +
        "         CAST(tc.company_id AS VARCHAR) AS company_id_str, " +
        "         tc.logo_url, " +
        "         tc.website, " +
        "         tc.total_entries AS company_total_entries, " +
        "         tc.most_recent_entry, " +
        "         tc.weighted_score, " +
        "         sl.name AS internalLevel, " +
        "         sl.hierarchy_rank, " +
        "         AVG(s.base_salary)        AS avgBaseSalary, " +
        "         AVG(s.bonus)              AS avgBonus, " +
        "         AVG(s.equity)             AS avgEquity, " +
        "         AVG(s.total_compensation) AS avgTotalCompensation, " +
        "         COUNT(*)                  AS cnt " +
        "  FROM salary_entries s " +
        "  JOIN top_companies tc ON s.company_id = tc.company_id " +
        "  JOIN standardized_levels sl ON sl.id = s.standardized_level_id " +
        "  WHERE s.review_status = 'APPROVED' " +
        "    AND s.location IN (:locations) " +
        "  GROUP BY tc.company_name, tc.company_id, tc.logo_url, tc.website, " +
        "           tc.total_entries, tc.most_recent_entry, tc.weighted_score, " +
        "           sl.id, sl.name, sl.hierarchy_rank " +
        ") " +
        "SELECT company_name, company_id_str, logo_url, website, internalLevel, " +
        "       avgBaseSalary, avgBonus, avgEquity, avgTotalCompensation, cnt, " +
        "       company_total_entries, most_recent_entry, hierarchy_rank " +
        "FROM level_agg " +
        "ORDER BY weighted_score DESC, hierarchy_rank ASC",
        nativeQuery = true)
    List<Object[]> avgSalaryByCompanyAndLevelFilteredRaw(@Param("locations") List<String> locations);

    // Job-function-filtered variant: limits levels to entries for a specific job function.
    // top_companies still ranks by weighted_score across ALL approved entries so the
    // company order stays stable; level_agg then restricts to the chosen function.
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
        "  LIMIT 20 " +
        "), " +
        "level_agg AS ( " +
        "  SELECT tc.company_name, " +
        "         CAST(tc.company_id AS VARCHAR) AS company_id_str, " +
        "         tc.logo_url, " +
        "         tc.website, " +
        "         tc.total_entries AS company_total_entries, " +
        "         tc.most_recent_entry, " +
        "         tc.weighted_score, " +
        "         fl.name AS internalLevel, " +
        "         fl.sort_order AS hierarchy_rank, " +
        "         AVG(s.base_salary)        AS avgBaseSalary, " +
        "         AVG(s.bonus)              AS avgBonus, " +
        "         AVG(s.equity)             AS avgEquity, " +
        "         AVG(s.total_compensation) AS avgTotalCompensation, " +
        "         COUNT(*)                  AS cnt " +
        "  FROM salary_entries s " +
        "  JOIN top_companies tc ON s.company_id = tc.company_id " +
        "  JOIN function_levels fl ON fl.id = s.function_level_id " +
        "  WHERE s.review_status = 'APPROVED' " +
        "    AND s.job_function_id = CAST(:jobFunctionId AS uuid) " +
        "  GROUP BY tc.company_name, tc.company_id, tc.logo_url, tc.website, " +
        "           tc.total_entries, tc.most_recent_entry, tc.weighted_score, " +
        "           fl.id, fl.name, fl.sort_order " +
        ") " +
        "SELECT company_name, company_id_str, logo_url, website, internalLevel, " +
        "       avgBaseSalary, avgBonus, avgEquity, avgTotalCompensation, cnt, " +
        "       company_total_entries, most_recent_entry, hierarchy_rank " +
        "FROM level_agg " +
        "ORDER BY weighted_score DESC, hierarchy_rank ASC",
        nativeQuery = true)
    List<Object[]> avgSalaryByCompanyAndLevelByFunctionRaw(@Param("jobFunctionId") String jobFunctionId);

    // Location + job-function filtered variant
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
        "  LIMIT 20 " +
        "), " +
        "level_agg AS ( " +
        "  SELECT tc.company_name, " +
        "         CAST(tc.company_id AS VARCHAR) AS company_id_str, " +
        "         tc.logo_url, " +
        "         tc.website, " +
        "         tc.total_entries AS company_total_entries, " +
        "         tc.most_recent_entry, " +
        "         tc.weighted_score, " +
        "         fl.name AS internalLevel, " +
        "         fl.sort_order AS hierarchy_rank, " +
        "         AVG(s.base_salary)        AS avgBaseSalary, " +
        "         AVG(s.bonus)              AS avgBonus, " +
        "         AVG(s.equity)             AS avgEquity, " +
        "         AVG(s.total_compensation) AS avgTotalCompensation, " +
        "         COUNT(*)                  AS cnt " +
        "  FROM salary_entries s " +
        "  JOIN top_companies tc ON s.company_id = tc.company_id " +
        "  JOIN function_levels fl ON fl.id = s.function_level_id " +
        "  WHERE s.review_status = 'APPROVED' " +
        "    AND s.location IN (:locations) " +
        "    AND s.job_function_id = CAST(:jobFunctionId AS uuid) " +
        "  GROUP BY tc.company_name, tc.company_id, tc.logo_url, tc.website, " +
        "           tc.total_entries, tc.most_recent_entry, tc.weighted_score, " +
        "           fl.id, fl.name, fl.sort_order " +
        ") " +
        "SELECT company_name, company_id_str, logo_url, website, internalLevel, " +
        "       avgBaseSalary, avgBonus, avgEquity, avgTotalCompensation, cnt, " +
        "       company_total_entries, most_recent_entry, hierarchy_rank " +
        "FROM level_agg " +
        "ORDER BY weighted_score DESC, hierarchy_rank ASC",
        nativeQuery = true)
    List<Object[]> avgSalaryByCompanyAndLevelByFunctionFilteredRaw(
            @Param("jobFunctionId") String jobFunctionId,
            @Param("locations") List<String> locations);
}
