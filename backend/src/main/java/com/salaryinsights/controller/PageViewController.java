package com.salaryinsights.controller;

import com.salaryinsights.dto.response.ApiResponse;
import com.salaryinsights.service.impl.PageViewService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * POST /public/track
 * Lightweight fire-and-forget page view tracking.
 * No auth required. Always returns 204 — caller ignores the response.
 */
@RestController
@RequestMapping("/public/track")
@RequiredArgsConstructor
public class PageViewController {

    private final PageViewService pageViewService;

    @PostMapping
    public ResponseEntity<Void> track(
            @RequestParam String page,
            @RequestHeader(value = "Referer",    required = false) String referrer,
            @RequestHeader(value = "X-Real-IP",  required = false) String realIp,
            HttpServletRequest request
    ) {
        String ip = realIp != null ? realIp : request.getRemoteAddr();
        String ua = request.getHeader("User-Agent");
        pageViewService.record(page, ip, ua, referrer);
        return ResponseEntity.noContent().build();
    }
}
