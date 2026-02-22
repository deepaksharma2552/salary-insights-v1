package com.salaryinsights.repository;

import com.salaryinsights.entity.StandardizedLevel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface StandardizedLevelRepository extends JpaRepository<StandardizedLevel, UUID> {
    Optional<StandardizedLevel> findByName(String name);
    boolean existsByName(String name);
}
