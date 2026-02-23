@Configuration
@EnableWebSecurity
@EnableMethodSecurity // Allows @PreAuthorize("hasRole('ADMIN')")
public class SecurityConfig {

    private final CustomOAuth2UserService customOAuth2UserService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter; // 1. Inject your filter

    public SecurityConfig(CustomOAuth2UserService customOAuth2UserService, 
                          JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.customOAuth2UserService = customOAuth2UserService;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            // 2. IMPORTANT: Return 401 instead of 302 Redirect
            .exceptionHandling(exception -> exception
                .authenticationEntryPoint((request, response, authException) -> {
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
                })
            )
            // 3. IMPORTANT: Make it Stateless
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/", "/login/**", "/error", "/api/auth/**", "/auth/**",
                    "/api/public/**", "/public/**", "/api/health", "/health"
                ).permitAll()
                // 4. Secure Admin routes explicitly if needed
                .requestMatchers("/api/admin/**").hasRole("ADMIN") 
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                .userInfoEndpoint(userInfo -> userInfo
                    .userService(customOAuth2UserService)
                )
            );

        // 5. Add your JWT filter before the standard UsernamePassword filter
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }
}