package com.salaryinsights.repository;

import com.salaryinsights.entity.FunctionLevel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FunctionLevelRepository extends JpaRepository<FunctionLevel, UUID> {

    List<FunctionLevel> findByJobFunctionIdOrderBySortOrderAsc(UUID jobFunctionId);

    boolean existsByJobFunctionIdAndName(UUID jobFunctionId, String name);
}
