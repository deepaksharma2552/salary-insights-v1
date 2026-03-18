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

    @Query(value =
        "SELECT location AS groupKey, AVG(base_salary) AS avgBaseSalary, AVG(total_compensation) AS avgTotalCompensation, COUNT(*) AS count " +
        "FROM salary_entries " +
        "WHERE review_status = 'APPROVED' AND location IS NOT NULL " +
        "GROUP BY location ORDER BY AVG(base_salary) DESC",
        nativeQuery = true)
    List<Object[]> avgSalaryByLocationRaw();

    @Query(value =
        "SELECT c.name AS groupKey, AVG(s.base_salary) AS avgBaseSalary, AVG(s.total_compensation) AS avgTotalCompensation, COUNT(*) AS count " +
        "FROM salary_entries s JOIN companies c ON s.company_id = c.id " +
        "WHERE s.review_status = 'APPROVED' " +
        "GROUP BY c.name ORDER BY AVG(s.base_salary) DESC",
        nativeQuery = true)
    List<Object[]> avgSalaryByCompanyRaw();

    @Query(value =
        "SELECT c.name AS companyName, " +
        "CASE s.company_internal_level " +
        "WHEN 'SDE_1' THEN 'SDE 1' " +
        "WHEN 'SDE_2' THEN 'SDE 2' " +
        "WHEN 'SDE_3' THEN 'SDE 3' " +
        "WHEN 'STAFF_ENGINEER' THEN 'Staff Engineer' " +
        "WHEN 'PRINCIPAL_ENGINEER' THEN 'Principal Engineer' " +
        "WHEN 'ARCHITECT' THEN 'Architect' " +
        "WHEN 'ENGINEERING_MANAGER' THEN 'Engineering Manager' " +
        "WHEN 'SR_ENGINEERING_MANAGER' THEN 'Sr. Engineering Manager' " +
        "WHEN 'DIRECTOR' THEN 'Director' " +
        "WHEN 'SR_DIRECTOR' THEN 'Sr. Director' " +
        "WHEN 'VP' THEN 'VP' " +
        "ELSE 'Unknown' END AS internalLevel, " +
        "AVG(s.base_salary) AS avgBaseSalary, COUNT(*) AS count " +
        "FROM salary_entries s JOIN companies c ON s.company_id = c.id " +
        "WHERE s.review_status = 'APPROVED' AND s.company_internal_level IS NOT NULL " +
        "GROUP BY c.name, s.company_internal_level " +
        "ORDER BY c.name, AVG(s.base_salary) DESC",
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
