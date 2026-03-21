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

        // launchpadResources — all active resources in one entry.
        // Admin-curated dataset (~200-800 items max). TTL 6hr; evicted on any admin write.
        // Frontend filters client-side from this single cache entry — zero API calls per filter.
        manager.registerCustomCache("launchpadResources",
            Caffeine.newBuilder()
                .maximumSize(20)
                .expireAfterWrite(6, TimeUnit.HOURS)
                .recordStats()
                .build());

        // launchpadExp — only the hot public board paths (no-filter page 1, recent pages).
        // Arbitrary filter combos hit the DB directly (fast via partial indexes).
        // Short TTL (5min) because new experiences get approved regularly.
        manager.registerCustomCache("launchpadExp",
            Caffeine.newBuilder()
                .maximumSize(100)
                .expireAfterWrite(5, TimeUnit.MINUTES)
                .recordStats()
                .build());

        // launchpadCounts — landing page stats (COUNT aggregates). 30min TTL.
        manager.registerCustomCache("launchpadCounts",
            Caffeine.newBuilder()
                .maximumSize(10)
                .expireAfterWrite(30, TimeUnit.MINUTES)
                .recordStats()
                .build());

        return manager;
    }
}
