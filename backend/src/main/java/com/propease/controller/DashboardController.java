package com.propease.controller;

import com.propease.dto.response.DashboardStatsResponse;
import com.propease.dto.response.TenantDashboardResponse;
import com.propease.entity.Profile;
import com.propease.repository.ProfileRepository;
import com.propease.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final ProfileRepository profileRepository;

    @GetMapping("/admin/stats")
    public ResponseEntity<DashboardStatsResponse> getAdminStats(@AuthenticationPrincipal UserDetails userDetails) {
        Profile profile = profileRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(dashboardService.getAdminDashboard(profile.getId()));
    }

    @GetMapping("/tenant/dashboard")
    public ResponseEntity<TenantDashboardResponse> getTenantDashboard(@AuthenticationPrincipal UserDetails userDetails) {
        Profile profile = profileRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(dashboardService.getTenantDashboard(profile.getId()));
    }
}
