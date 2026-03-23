package com.salaryinsights.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

@Configuration
public class BeansConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Dedicated bounded executor for @Async audit log writes.
     *
     * Why a separate executor instead of the default SimpleAsyncTaskExecutor:
     *   - SimpleAsyncTaskExecutor spins up a new thread per call — unbounded,
     *     no queue, no backpressure. At high write volume it silently drops logs
     *     or exhausts threads.
     *   - This executor: 2 core threads handle normal load, bursts use up to 4,
     *     500-entry queue absorbs spikes, CallerRunsPolicy means if the queue
     *     fills the caller thread handles it inline — logs are NEVER silently lost.
     *
     * Sizing rationale (adjust for your traffic):
     *   - Audit writes are fast (single INSERT) — 2 core threads handle
     *     ~hundreds of writes/second without saturation.
     *   - Queue of 500 gives ~30s of headroom at 15 writes/sec before
     *     CallerRunsPolicy kicks in — plenty for any realistic burst.
     *   - Max pool of 4 caps thread creation during prolonged bursts.
     */
    /**
     * Dedicated executor for @Async page view tracking writes.
     * Unlike audit logs, dropping a page view under extreme load is acceptable —
     * so we use DiscardPolicy instead of CallerRunsPolicy.
     * 2 core threads handle normal traffic; queue of 1000 absorbs bursts.
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
        // DiscardPolicy: if queue full, silently drop — tracking must never block requests
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.DiscardPolicy());
        executor.initialize();
        return executor;
    }

    @Bean(name = "auditExecutor")
    public Executor auditExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("audit-");
        executor.setKeepAliveSeconds(60);
        executor.setAllowCoreThreadTimeOut(true);   // reclaim idle core threads during quiet periods
        // CallerRunsPolicy: if queue is full, run on calling thread — never drop a log
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
}
