package com.propease.controller;

import com.propease.dto.request.LeaseRequest;
import com.propease.dto.response.LeaseResponse;
import com.propease.entity.Profile;
import com.propease.repository.ProfileRepository;
import com.propease.service.LeaseService;
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
@RequestMapping("/api/v1/leases")
@RequiredArgsConstructor
public class LeaseController {

    private final LeaseService leaseService;
    private final ProfileRepository profileRepository;

    @GetMapping
    public ResponseEntity<List<LeaseResponse>> getLeases(@AuthenticationPrincipal UserDetails userDetails) {
        Profile profile = profileRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(leaseService.getLeasesByLandlord(profile.getId()));
    }

    @PostMapping
    public ResponseEntity<LeaseResponse> createLease(@Valid @RequestBody LeaseRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(leaseService.createLease(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<LeaseResponse> getLease(@PathVariable UUID id) {
        return ResponseEntity.ok(leaseService.getLease(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<LeaseResponse> updateLease(
            @PathVariable UUID id,
            @Valid @RequestBody LeaseRequest request) {
        return ResponseEntity.ok(leaseService.updateLease(id, request));
    }

    @GetMapping("/expiring")
    public ResponseEntity<List<LeaseResponse>> getExpiringLeases(
            @RequestParam(defaultValue = "60") int days) {
        return ResponseEntity.ok(leaseService.getExpiringLeases(days));
    }
}
