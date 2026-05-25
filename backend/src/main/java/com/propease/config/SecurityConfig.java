package com.propease.config;

import com.propease.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                        .requestMatchers("/h2-console/**").permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Admin endpoints — landlord, admin, manager
                        .requestMatchers("/api/v1/dashboard/admin/**").hasAnyRole("LANDLORD", "ADMIN", "MANAGER")
                        .requestMatchers("/api/v1/properties/**").hasAnyRole("LANDLORD", "ADMIN", "MANAGER")
                        .requestMatchers("/api/v1/tenants/**").hasAnyRole("LANDLORD", "ADMIN", "MANAGER")
                        .requestMatchers("/api/v1/leases/**").hasAnyRole("LANDLORD", "ADMIN", "MANAGER")

                        // Tenant endpoints
                        .requestMatchers("/api/v1/dashboard/tenant/**").hasRole("TENANT")
                        .requestMatchers("/api/v1/payments/pay").hasRole("TENANT")
                        .requestMatchers("/api/v1/payments/my-history").hasRole("TENANT")
                        .requestMatchers("/api/v1/maintenance/my-requests").hasRole("TENANT")
                        .requestMatchers("/api/v1/documents/my-documents").hasRole("TENANT")

                        // Shared endpoints (authenticated)
                        .anyRequest().authenticated()
                )
                .headers(headers -> headers.frameOptions(frame -> frame.disable())) // H2 console
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
