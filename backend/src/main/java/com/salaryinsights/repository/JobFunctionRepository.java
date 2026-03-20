package com.salaryinsights.repository;

import com.salaryinsights.entity.JobFunction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface JobFunctionRepository extends JpaRepository<JobFunction, UUID> {

    boolean existsByName(String name);

    // Fetch all functions with their levels in one query — used by the public endpoint
    // that feeds the frontend dropdown. N+1 avoided via JOIN FETCH.
    @Query("SELECT jf FROM JobFunction jf LEFT JOIN FETCH jf.levels ORDER BY jf.sortOrder ASC")
    List<JobFunction> findAllWithLevels();
}
