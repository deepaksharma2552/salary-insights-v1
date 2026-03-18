package com.salaryinsights.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * In-memory cache configuration using Caffeine.
 *
 * "analytics" cache — stores by-location, by-company, by-company-level aggregations.
 * These are expensive full-table aggregations that only change when a salary entry
 * is approved or rejected. TTL of 10 minutes provides a safety net; the primary
 * invalidation is @CacheEvict on SalaryService.reviewSalary().
 *
 * Max 50 entries is generous — we currently have 3 keys. Room for future expansion.
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager("analytics");
        manager.setCaffeine(
            Caffeine.newBuilder()
                .maximumSize(50)
                .expireAfterWrite(10, TimeUnit.MINUTES)
                .recordStats()          // enables cache hit/miss metrics via /actuator/metrics
        );
        return manager;
    }
}
