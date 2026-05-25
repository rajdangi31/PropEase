package com.propease.controller;

import com.propease.dto.response.TenantResponse;
import com.propease.service.ProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tenants")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @GetMapping
    public ResponseEntity<List<TenantResponse>> getTenants(
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(profileService.getAllTenants(search));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TenantResponse> getTenant(@PathVariable UUID id) {
        return ResponseEntity.ok(profileService.getTenant(id));
    }
}
