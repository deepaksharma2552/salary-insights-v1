package com.salaryinsights.security.oauth2;

import com.salaryinsights.entity.User;
import com.salaryinsights.repository.UserRepository;
import com.salaryinsights.security.JwtTokenProvider;
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
 * We issue a JWT and redirect to the frontend with the token as a query param.
 * The React app picks it up, stores it, and redirects to the home page.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    @Value("${app.oauth2.redirect-uri:http://localhost:3000/oauth2/redirect}")
    private String redirectUri;

    private final JwtTokenProvider  jwtTokenProvider;
    private final UserRepository    userRepository;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = (String) oAuth2User.getAttributes().get("email");

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("User not found after OAuth2 login: " + email));

        String token = jwtTokenProvider.generateToken(user);

        String targetUrl = UriComponentsBuilder.fromUriString(redirectUri)
                .queryParam("token", token)
                .queryParam("email", user.getEmail())
                .queryParam("firstName", user.getFirstName())
                .queryParam("lastName", user.getLastName())
                .queryParam("role", user.getRole().name())
                .build().toUriString();

        log.info("OAuth2 success → redirecting {} to frontend", email);
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
