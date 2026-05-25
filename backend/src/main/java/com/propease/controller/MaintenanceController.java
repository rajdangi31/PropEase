package com.propease.controller;

import com.propease.dto.request.MaintenanceLogRequest;
import com.propease.dto.request.MaintenanceRequestDto;
import com.propease.dto.response.MaintenanceRequestResponse;
import com.propease.entity.Profile;
import com.propease.repository.ProfileRepository;
import com.propease.service.MaintenanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/maintenance")
@RequiredArgsConstructor
public class MaintenanceController {

    private final MaintenanceService maintenanceService;
    private final ProfileRepository profileRepository;

    @GetMapping
    public ResponseEntity<List<MaintenanceRequestResponse>> getAllRequests(
            @AuthenticationPrincipal UserDetails userDetails) {
        Profile profile = profileRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(maintenanceService.getRequestsByLandlord(profile.getId()));
    }

    @PostMapping
    public ResponseEntity<MaintenanceRequestResponse> createRequest(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody MaintenanceRequestDto request) {
        Profile profile = profileRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(maintenanceService.createRequest(profile.getId(), request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MaintenanceRequestResponse> getRequest(@PathVariable UUID id) {
        return ResponseEntity.ok(maintenanceService.getRequest(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MaintenanceRequestResponse> updateRequest(
            @PathVariable UUID id,
            @Valid @RequestBody MaintenanceRequestDto request) {
        return ResponseEntity.ok(maintenanceService.updateRequest(id, request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<MaintenanceRequestResponse> updateStatus(
            @PathVariable UUID id,
            @RequestBody java.util.Map<String, String> body) {
        return ResponseEntity.ok(maintenanceService.updateStatus(id, body.get("status")));
    }

    @PostMapping("/{id}/logs")
    public ResponseEntity<MaintenanceRequestResponse> addLog(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody MaintenanceLogRequest logRequest) {
        Profile profile = profileRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(maintenanceService.addLog(id, profile.getId(), logRequest));
    }

    @GetMapping("/my-requests")
    public ResponseEntity<List<MaintenanceRequestResponse>> getMyRequests(
            @AuthenticationPrincipal UserDetails userDetails) {
        Profile profile = profileRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(maintenanceService.getRequestsByTenant(profile.getId()));
    }
}
