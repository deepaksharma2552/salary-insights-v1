package com.salaryinsights.security.oauth2;

import com.salaryinsights.entity.User;
import com.salaryinsights.enums.Role;
import com.salaryinsights.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.InternalAuthenticationServiceException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Called by Spring Security after a successful OAuth2 authorization.
 * Looks up or creates a User record, then returns a principal.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository  userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        try {
            return processOAuth2User(userRequest, oAuth2User);
        } catch (OAuth2AuthenticationException e) {
            throw e;
        } catch (Exception e) {
            log.error("OAuth2 login processing error: {}", e.getMessage(), e);
            throw new InternalAuthenticationServiceException(e.getMessage(), e);
        }
    }

    private OAuth2User processOAuth2User(OAuth2UserRequest request, OAuth2User oAuth2User) {
        String registrationId = request.getClientRegistration().getRegistrationId();
        OAuth2UserInfo userInfo = OAuth2UserInfoFactory.getOAuth2UserInfo(
                registrationId, oAuth2User.getAttributes());

        if (userInfo.getEmail() == null || userInfo.getEmail().isBlank()) {
            throw new OAuth2AuthenticationException("Email not provided by " + registrationId);
        }

        User user = userRepository.findByEmail(userInfo.getEmail())
                .map(existing -> updateExistingUser(existing, userInfo))
                .orElseGet(() -> registerNewUser(userInfo, registrationId));

        log.info("OAuth2 login successful: {} via {}", user.getEmail(), registrationId);

        return new DefaultOAuth2User(
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())),
                Map.of(
                        "email",     user.getEmail(),
                        "firstName", user.getFirstName(),
                        "lastName",  user.getLastName(),
                        "role",      user.getRole().name(),
                        "userId",    user.getId().toString()
                ),
                "email"
        );
    }

    private User registerNewUser(OAuth2UserInfo info, String provider) {
        String[] nameParts = splitName(info.getName());
        User user = User.builder()
                .firstName(nameParts[0])
                .lastName(nameParts[1])
                .email(info.getEmail())
                // OAuth2 users get a random password hash — they never use password login
                .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                .role(Role.USER)
                .active(true)
                .build();
        return userRepository.save(user);
    }

    private User updateExistingUser(User user, OAuth2UserInfo info) {
        // Only update name if it came from a social provider (don't overwrite manual edits)
        if (info.getName() != null && !info.getName().isBlank()) {
            String[] parts = splitName(info.getName());
            user.setFirstName(parts[0]);
            user.setLastName(parts[1]);
        }
        return userRepository.save(user);
    }

    private String[] splitName(String fullName) {
        if (fullName == null || fullName.isBlank()) return new String[]{"User", ""};
        String[] parts = fullName.trim().split("\\s+", 2);
        return parts.length == 2 ? parts : new String[]{parts[0], ""};
    }
}
