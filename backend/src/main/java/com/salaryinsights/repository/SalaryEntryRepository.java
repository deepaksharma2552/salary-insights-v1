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

    @Query("SELECT new com.salaryinsights.dto.response.SalaryAggregationDTO(" +
           "s.location, AVG(s.baseSalary), AVG(s.totalCompensation), COUNT(s)) " +
           "FROM SalaryEntry s " +
           "WHERE s.reviewStatus = com.salaryinsights.enums.ReviewStatus.APPROVED AND s.location IS NOT NULL " +
           "GROUP BY s.location ORDER BY AVG(s.baseSalary) DESC")
    List<SalaryAggregationDTO> avgSalaryByLocation();

    @Query("SELECT new com.salaryinsights.dto.response.SalaryAggregationDTO(" +
           "c.name, AVG(s.baseSalary), AVG(s.totalCompensation), COUNT(s)) " +
           "FROM SalaryEntry s JOIN s.company c " +
           "WHERE s.reviewStatus = com.salaryinsights.enums.ReviewStatus.APPROVED " +
           "GROUP BY c.name ORDER BY AVG(s.baseSalary) DESC")
    List<SalaryAggregationDTO> avgSalaryByCompany();

    @Query("SELECT new com.salaryinsights.dto.response.CompanyLevelSalaryDTO(" +
           "c.name, " +
           "CASE s.companyInternalLevel " +
           "WHEN com.salaryinsights.enums.InternalLevel.SDE_1 THEN 'SDE 1' " +
           "WHEN com.salaryinsights.enums.InternalLevel.SDE_2 THEN 'SDE 2' " +
           "WHEN com.salaryinsights.enums.InternalLevel.SDE_3 THEN 'SDE 3' " +
           "WHEN com.salaryinsights.enums.InternalLevel.STAFF_ENGINEER THEN 'Staff Engineer' " +
           "WHEN com.salaryinsights.enums.InternalLevel.PRINCIPAL_ENGINEER THEN 'Principal Engineer' " +
           "WHEN com.salaryinsights.enums.InternalLevel.ARCHITECT THEN 'Architect' " +
           "WHEN com.salaryinsights.enums.InternalLevel.ENGINEERING_MANAGER THEN 'Engineering Manager' " +
           "WHEN com.salaryinsights.enums.InternalLevel.SR_ENGINEERING_MANAGER THEN 'Sr. Engineering Manager' " +
           "WHEN com.salaryinsights.enums.InternalLevel.DIRECTOR THEN 'Director' " +
           "WHEN com.salaryinsights.enums.InternalLevel.SR_DIRECTOR THEN 'Sr. Director' " +
           "WHEN com.salaryinsights.enums.InternalLevel.VP THEN 'VP' " +
           "ELSE 'Unknown' END, " +
           "AVG(s.baseSalary), COUNT(s)) " +
           "FROM SalaryEntry s JOIN s.company c " +
           "WHERE s.reviewStatus = com.salaryinsights.enums.ReviewStatus.APPROVED " +
           "AND s.companyInternalLevel IS NOT NULL " +
           "GROUP BY c.name, s.companyInternalLevel " +
           "ORDER BY c.name, AVG(s.baseSalary) DESC")
    List<com.salaryinsights.dto.response.CompanyLevelSalaryDTO> avgSalaryByCompanyAndLevel();

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
