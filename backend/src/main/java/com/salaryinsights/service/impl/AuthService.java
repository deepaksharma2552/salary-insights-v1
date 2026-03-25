package com.salaryinsights.service.impl;

import com.salaryinsights.dto.request.LoginRequest;
import com.salaryinsights.dto.request.RegisterRequest;
import com.salaryinsights.dto.response.AuthResponse;
import com.salaryinsights.entity.User;
import com.salaryinsights.enums.Role;
import com.salaryinsights.exception.BadRequestException;
import com.salaryinsights.repository.UserRepository;
import com.salaryinsights.security.JwtTokenProvider;
import com.salaryinsights.util.CookieUtils;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository        userRepository;
    private final PasswordEncoder       passwordEncoder;
    private final JwtTokenProvider      jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final CookieUtils           cookieUtils;

    @Value("${app.jwt.expiration}")
    private Long jwtExpiration;

    @Transactional
    public AuthResponse register(RegisterRequest request, HttpServletResponse response) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already registered");
        }

        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.USER)
                .active(true)
                .build();

        userRepository.save(user);
        log.info("New user registered: {}", user.getEmail());

        String token = jwtTokenProvider.generateToken(user);
        // Set the JWT in an httpOnly cookie — JS cannot read it, reducing XSS risk.
        cookieUtils.addAuthCookie(response, token);
        return buildAuthResponse(user, token);
    }

    public AuthResponse login(LoginRequest request, HttpServletResponse response) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadRequestException("User not found"));

        String token = jwtTokenProvider.generateToken(user);
        log.info("User logged in: {}", user.getEmail());
        // Set the JWT in an httpOnly cookie — JS cannot read it, reducing XSS risk.
        cookieUtils.addAuthCookie(response, token);
        return buildAuthResponse(user, token);
    }

    /** Called on explicit logout — clears the httpOnly auth cookie. */
    public void logout(HttpServletResponse response) {
        cookieUtils.clearAuthCookie(response);
    }

    private AuthResponse buildAuthResponse(User user, String token) {
        // accessToken is still returned in the JSON body so the frontend can
        // hydrate AuthContext (email, name, role) without reading the cookie.
        // The frontend should store ONLY the non-sensitive user fields (not the
        // token itself) in React state / localStorage after this migration.
        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .expiresIn(jwtExpiration)
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole())
                .build();
    }
}
