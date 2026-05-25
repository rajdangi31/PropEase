package com.propease.controller;

import com.propease.dto.request.UnitRequest;
import com.propease.dto.response.UnitResponse;
import com.propease.service.UnitService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/properties/{propertyId}/units")
@RequiredArgsConstructor
public class UnitController {

    private final UnitService unitService;

    @GetMapping
    public ResponseEntity<List<UnitResponse>> getUnits(@PathVariable UUID propertyId) {
        return ResponseEntity.ok(unitService.getUnitsByProperty(propertyId));
    }

    @PostMapping
    public ResponseEntity<UnitResponse> createUnit(
            @PathVariable UUID propertyId,
            @Valid @RequestBody UnitRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(unitService.createUnit(propertyId, request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UnitResponse> getUnit(@PathVariable UUID propertyId, @PathVariable UUID id) {
        return ResponseEntity.ok(unitService.getUnit(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UnitResponse> updateUnit(
            @PathVariable UUID propertyId,
            @PathVariable UUID id,
            @Valid @RequestBody UnitRequest request) {
        return ResponseEntity.ok(unitService.updateUnit(id, request));
    }
}
