package com.salaryinsights.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.client.RestTemplate;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

@Configuration
public class BeansConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Dedicated executor for @Async page view tracking writes.
     * Dropping a page view under extreme load is acceptable — DiscardPolicy.
     */
    @Bean(name = "trackingExecutor")
    public Executor trackingExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(2);
        executor.setQueueCapacity(1000);
        executor.setThreadNamePrefix("tracking-");
        executor.setKeepAliveSeconds(60);
        executor.setAllowCoreThreadTimeOut(true);
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.DiscardPolicy());
        executor.initialize();
        return executor;
    }

    /**
     * Dedicated executor for @Async audit log writes.
     * CallerRunsPolicy — logs are never silently lost.
     */
    @Bean(name = "auditExecutor")
    public Executor auditExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("audit-");
        executor.setKeepAliveSeconds(60);
        executor.setAllowCoreThreadTimeOut(true);
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }

    /**
     * Dedicated executor for AI salary enrichment jobs.
     *
     * Each enrichment job calls the Claude API with web_search enabled,
     * which typically takes 15–60 s. We use a small pool because:
     *   - Admin-only, low-frequency feature (a few calls per day at most)
     *   - We don't want a burst of enrichment requests to starve other threads
     *   - 2 concurrent enrichments is plenty; extras queue up to 10 deep
     *   - AbortPolicy surfaces a clear error to the caller if the queue fills,
     *     rather than silently blocking or dropping
     */
    @Bean(name = "enrichExecutor")
    public Executor enrichExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(2);
        executor.setQueueCapacity(10);
        executor.setThreadNamePrefix("enrich-");
        executor.setKeepAliveSeconds(120);
        executor.setAllowCoreThreadTimeOut(true);
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.AbortPolicy());
        executor.initialize();
        return executor;
    }

    /**
     * RestTemplate with a 90-second read timeout, used by AiSalaryEnrichmentService.
     *
     * The default RestTemplate (defined in AppConfig) uses the JDK's default
     * timeout which can be as low as 30 s — not enough for Claude + web_search.
     * This bean is injected by name into AiSalaryEnrichmentService only.
     *
     * Connect timeout: 10 s  — fail fast if Anthropic is unreachable
     * Read timeout:    90 s  — generous ceiling for web_search + LLM inference
     */
    @Bean(name = "anthropicRestTemplate")
    public RestTemplate anthropicRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);  // 10 s
        factory.setReadTimeout(90_000);     // 90 s
        return new RestTemplate(factory);
    }
}
