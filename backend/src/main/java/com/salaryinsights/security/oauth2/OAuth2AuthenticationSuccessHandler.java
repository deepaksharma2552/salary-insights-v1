package com.salaryinsights.security.oauth2;

import com.salaryinsights.entity.User;
import com.salaryinsights.repository.UserRepository;
import com.salaryinsights.security.JwtTokenProvider;
import com.salaryinsights.util.CookieUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

/**
 * After a successful OAuth2 login Spring redirects to this handler.
 *
 * Previously we passed the JWT as a ?token= query param — visible in browser
 * history, server logs, and Referer headers.  Now we:
 *   1. Set the token in an httpOnly cookie (invisible to JS, not in the URL).
 *   2. Redirect with only non-sensitive user fields as query params so the
 *      React OAuth2RedirectPage can hydrate AuthContext without a second API call.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    @Value("${app.oauth2.redirect-uri:http://localhost:3000/oauth2/redirect}")
    private String redirectUri;

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository   userRepository;
    private final CookieUtils      cookieUtils;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = (String) oAuth2User.getAttributes().get("email");

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("User not found after OAuth2 login: " + email));

        String token = jwtTokenProvider.generateToken(user);

        // Set JWT in httpOnly cookie — never exposed in the URL or to JS.
        cookieUtils.addAuthCookie(response, token);

        // Redirect with only non-sensitive identity fields; token is NOT in the URL.
        String targetUrl = UriComponentsBuilder.fromUriString(redirectUri)
                .queryParam("email",     user.getEmail())
                .queryParam("firstName", user.getFirstName())
                .queryParam("lastName",  user.getLastName())
                .queryParam("role",      user.getRole().name())
                .build().toUriString();

        log.info("OAuth2 success → redirecting {} to frontend (token in cookie)", email);
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
