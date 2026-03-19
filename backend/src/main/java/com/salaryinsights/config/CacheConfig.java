package com.salaryinsights.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Caffeine cache — replaces ConcurrentMapCacheManager.
 *
 * Why Caffeine over the old ConcurrentMapCacheManager:
 *   - TTL: entries expire after 1 hour so stale analytics data doesn't
 *     persist indefinitely if @CacheEvict is missed (e.g. direct DB edits).
 *   - Size bound: max 1000 entries prevents unbounded heap growth.
 *     With the dashboard location filter we now cache per-location combinations
 *     (up to 255 for 8 locations) — the old unbounded cache would grow forever.
 *   - Thread-safe W-TinyLFU eviction — better hit rate than LRU at same size.
 *
 * pom.xml dependency required:
 *   <dependency>
 *     <groupId>com.github.ben-manes.caffeine</groupId>
 *     <artifactId>caffeine</artifactId>
 *     <!-- version managed by spring-boot-dependencies -->
 *   </dependency>
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager("analytics");
        manager.setCaffeine(
            Caffeine.newBuilder()
                .maximumSize(1000)               // hard cap — evicts LFU entries beyond this
                .expireAfterWrite(1, TimeUnit.HOURS) // TTL: stale at most 1 hr even without @CacheEvict
                .recordStats()                   // enables cache hit/miss metrics via /actuator/metrics
        );
        return manager;
    }
}
