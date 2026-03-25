package com.salaryinsights.util;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Optional;

/**
 * Centralises all JWT-cookie logic so every auth path (email/password,
 * OAuth2, logout) sets and clears the cookie identically.
 *
 * Cookie attributes:
 *   HttpOnly  – JS cannot read the token; mitigates XSS token theft
 *   Secure    – only sent over HTTPS (disable in dev via app.cookie.secure=false)
 *   SameSite=Lax – sent on top-level navigations (OAuth2 redirect) but not on
 *                  cross-site sub-requests; solid CSRF protection without
 *                  breaking the Google OAuth2 redirect flow
 *   Path=/api – scoped so the browser only attaches the cookie to API calls,
 *               not to every static-asset request
 */
@Component
public class CookieUtils {

    public static final String COOKIE_NAME = "auth_token";

    @Value("${app.cookie.secure:true}")
    private boolean secureCookie;

    @Value("${app.jwt.expiration:86400000}")
    private long jwtExpirationMs;

    /** Write the JWT into an httpOnly cookie on the response. */
    public void addAuthCookie(HttpServletResponse response, String token) {
        int maxAgeSeconds = (int) (jwtExpirationMs / 1000);
        String cookieValue = String.format(
            "%s=%s; Max-Age=%d; Path=/api; HttpOnly; %sSameSite=Lax",
            COOKIE_NAME,
            token,
            maxAgeSeconds,
            secureCookie ? "Secure; " : ""
        );
        response.addHeader("Set-Cookie", cookieValue);
    }

    /** Clear the auth cookie (logout) by setting Max-Age=0. */
    public void clearAuthCookie(HttpServletResponse response) {
        String cookieValue = String.format(
            "%s=; Max-Age=0; Path=/api; HttpOnly; %sSameSite=Lax",
            COOKIE_NAME,
            secureCookie ? "Secure; " : ""
        );
        response.addHeader("Set-Cookie", cookieValue);
    }

    /** Extract the JWT value from the incoming request's cookies, if present. */
    public Optional<String> getAuthToken(HttpServletRequest request) {
        if (request.getCookies() == null) return Optional.empty();
        return Arrays.stream(request.getCookies())
                .filter(c -> COOKIE_NAME.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst();
    }
}
