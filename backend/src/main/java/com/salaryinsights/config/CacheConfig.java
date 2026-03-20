package com.salaryinsights.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Two caches with different TTL profiles:
 *
 * "analytics"     — salary aggregation results. Changes on every salary review.
 *                   TTL 1 hour. Max 1000 entries (covers all location combos).
 *
 * "referenceData" — job functions + levels. Changes only when admin edits them.
 *                   TTL 24 hours. Max 50 entries (tiny reference dataset).
 *                   Cache evicted immediately on any admin write via @CacheEvict.
 *                   24h TTL is a safety net for missed evictions (e.g. direct DB edits).
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager();

        // Each cache gets its own Caffeine spec via a named config
        manager.registerCustomCache("analytics",
            Caffeine.newBuilder()
                .maximumSize(1000)
                .expireAfterWrite(1, TimeUnit.HOURS)
                .recordStats()
                .build());

        manager.registerCustomCache("referenceData",
            Caffeine.newBuilder()
                .maximumSize(50)
                .expireAfterWrite(24, TimeUnit.HOURS)
                .recordStats()
                .build());

        return manager;
    }
}
