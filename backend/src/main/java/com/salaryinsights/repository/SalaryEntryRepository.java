package com.salaryinsights.repository;

import com.salaryinsights.dto.response.SalaryAggregationDTO;
import com.salaryinsights.entity.SalaryEntry;
import com.salaryinsights.enums.ExperienceLevel;
import com.salaryinsights.enums.ReviewStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SalaryEntryRepository extends JpaRepository<SalaryEntry, UUID> {

   @Query("SELECT s FROM SalaryEntry s JOIN FETCH s.company " +
       "WHERE s.reviewStatus = com.salaryinsights.enums.ReviewStatus.APPROVED AND " +
       "(cast(:companyId as uuid) IS NULL OR s.company.id = :companyId) AND " +
       "(cast(:jobTitle as string) IS NULL OR LOWER(s.jobTitle) LIKE LOWER(CONCAT('%', cast(:jobTitle as string), '%'))) AND " +
       "(cast(:location as string) IS NULL OR LOWER(s.location) LIKE LOWER(CONCAT('%', cast(:location as string), '%'))) AND " +
       "(:experienceLevel IS NULL OR s.experienceLevel = :experienceLevel)")
Page<SalaryEntry> findApprovedWithFilters(
    @Param("companyId") UUID companyId,
    @Param("jobTitle") String jobTitle,
    @Param("location") String location,
    @Param("experienceLevel") com.salaryinsights.enums.ExperienceLevel experienceLevel,
    Pageable pageable
);

    @Query("SELECT new com.salaryinsights.dto.response.SalaryAggregationDTO(" +
           "sl.name, AVG(s.baseSalary), AVG(s.totalCompensation), COUNT(s)) " +
           "FROM SalaryEntry s JOIN s.standardizedLevel sl " +
           "WHERE s.reviewStatus = 'APPROVED' " +
           "GROUP BY sl.name, sl.hierarchyRank ORDER BY sl.hierarchyRank")
    List<SalaryAggregationDTO> avgSalaryByStandardizedLevel();

    @Query("SELECT new com.salaryinsights.dto.response.SalaryAggregationDTO(" +
           "s.location, AVG(s.baseSalary), AVG(s.totalCompensation), COUNT(s)) " +
           "FROM SalaryEntry s " +
           "WHERE s.reviewStatus = 'APPROVED' AND s.location IS NOT NULL " +
           "GROUP BY s.location ORDER BY AVG(s.baseSalary) DESC")
    List<SalaryAggregationDTO> avgSalaryByLocation();

    @Query("SELECT new com.salaryinsights.dto.response.SalaryAggregationDTO(" +
           "c.name, AVG(s.baseSalary), AVG(s.totalCompensation), COUNT(s)) " +
           "FROM SalaryEntry s JOIN s.company c " +
           "WHERE s.reviewStatus = 'APPROVED' " +
           "GROUP BY c.name ORDER BY AVG(s.baseSalary) DESC")
    List<SalaryAggregationDTO> avgSalaryByCompany();

    long countByReviewStatus(ReviewStatus status);

    @Query(value = "SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as count " +
                   "FROM salary_entries WHERE created_at >= NOW() - INTERVAL '12 months' " +
                   "GROUP BY month ORDER BY month", nativeQuery = true)
    List<Object[]> submissionTrendLast12Months();

    Page<SalaryEntry> findByReviewStatus(ReviewStatus status, Pageable pageable);

    @Query("SELECT s FROM SalaryEntry s JOIN FETCH s.company JOIN FETCH s.submittedBy " +
           "WHERE s.reviewStatus = :status")
    Page<SalaryEntry> findByReviewStatusWithDetails(@Param("status") ReviewStatus status, Pageable pageable);
}
