package com.salaryinsights.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * In-memory cache using Spring's built-in ConcurrentMapCacheManager.
 * No extra dependencies required — works with spring-context which is
 * already on the classpath via spring-boot-starter.
 *
 * "analytics" cache — stores by-location, by-company, by-company-level aggregations.
 * These are expensive full-table aggregations that only change when a salary entry
 * is approved or rejected. Primary invalidation is @CacheEvict on reviewSalary().
 *
 * To upgrade to Caffeine (TTL + size bounds) later, just add the caffeine dependency
 * to pom.xml and swap this bean for CaffeineCacheManager — no other code changes needed.
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        // ConcurrentMapCacheManager is unbounded and has no TTL — entries live until
        // explicitly evicted via @CacheEvict. This is fine here because reviewSalary()
        // evicts all analytics entries on every approval/rejection, keeping data fresh.
        return new ConcurrentMapCacheManager("analytics");
    }
}
