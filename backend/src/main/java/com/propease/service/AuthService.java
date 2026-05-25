package com.propease.service;

import com.propease.dto.request.LoginRequest;
import com.propease.dto.request.RegisterRequest;
import com.propease.dto.response.AuthResponse;
import com.propease.dto.response.ProfileResponse;
import com.propease.entity.Profile;
import com.propease.enums.Role;
import com.propease.exception.BadRequestException;
import com.propease.repository.ProfileRepository;
import com.propease.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final ProfileRepository profileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final AuthenticationManager authenticationManager;

    public AuthResponse register(RegisterRequest request) {
        if (profileRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already registered");
        }

        Role role;
        try {
            role = Role.valueOf(request.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid role: " + request.getRole());
        }

        Profile profile = Profile.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .role(role)
                .build();

        profile = profileRepository.save(profile);
        return buildAuthResponse(profile);
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        Profile profile = profileRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadRequestException("Invalid credentials"));

        return buildAuthResponse(profile);
    }

    public AuthResponse refresh(String refreshToken) {
        if (!tokenProvider.validateToken(refreshToken)) {
            throw new BadRequestException("Invalid refresh token");
        }

        var userId = tokenProvider.getUserIdFromToken(refreshToken);
        Profile profile = profileRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found"));

        return buildAuthResponse(profile);
    }

    public ProfileResponse getCurrentUser(String email) {
        Profile profile = profileRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("User not found"));
        return mapToProfileResponse(profile);
    }

    private AuthResponse buildAuthResponse(Profile profile) {
        String accessToken = tokenProvider.generateAccessToken(
                profile.getId(), profile.getEmail(), profile.getRole().name());
        String refreshToken = tokenProvider.generateRefreshToken(profile.getId());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .user(mapToProfileResponse(profile))
                .build();
    }

    public static ProfileResponse mapToProfileResponse(Profile profile) {
        return ProfileResponse.builder()
                .id(profile.getId())
                .email(profile.getEmail())
                .firstName(profile.getFirstName())
                .lastName(profile.getLastName())
                .middleName(profile.getMiddleName())
                .phone(profile.getPhone())
                .role(profile.getRole().name())
                .onboardingCompleted(profile.getOnboardingCompleted())
                .avatarUrl(profile.getAvatarUrl())
                .build();
    }
}
