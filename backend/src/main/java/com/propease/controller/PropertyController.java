package com.propease.controller;

import com.propease.dto.request.PropertyRequest;
import com.propease.dto.response.PropertyResponse;
import com.propease.entity.Profile;
import com.propease.repository.ProfileRepository;
import com.propease.service.PropertyService;
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
@RequestMapping("/api/v1/properties")
@RequiredArgsConstructor
public class PropertyController {

    private final PropertyService propertyService;
    private final ProfileRepository profileRepository;

    @GetMapping
    public ResponseEntity<List<PropertyResponse>> getProperties(@AuthenticationPrincipal UserDetails userDetails) {
        Profile profile = profileRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(propertyService.getPropertiesByLandlord(profile.getId()));
    }

    @PostMapping
    public ResponseEntity<PropertyResponse> createProperty(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PropertyRequest request) {
        Profile profile = profileRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.status(HttpStatus.CREATED).body(propertyService.createProperty(profile.getId(), request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PropertyResponse> getProperty(@PathVariable UUID id) {
        return ResponseEntity.ok(propertyService.getProperty(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PropertyResponse> updateProperty(
            @PathVariable UUID id,
            @Valid @RequestBody PropertyRequest request) {
        return ResponseEntity.ok(propertyService.updateProperty(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProperty(@PathVariable UUID id) {
        propertyService.deleteProperty(id);
        return ResponseEntity.noContent().build();
    }
}
