package com.salaryinsights.repository;

import com.salaryinsights.entity.GuideStandardLevel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GuideStandardLevelRepository extends JpaRepository<GuideStandardLevel, UUID> {

    boolean existsByName(String name);

    // Used by admin list + public grid — always sorted by rank
    List<GuideStandardLevel> findAllByOrderByRankAsc();
}
