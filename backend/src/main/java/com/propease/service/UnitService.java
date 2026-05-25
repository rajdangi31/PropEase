package com.propease.service;

import com.propease.dto.request.UnitRequest;
import com.propease.dto.response.UnitResponse;
import com.propease.entity.Lease;
import com.propease.entity.LeaseTenant;
import com.propease.entity.Property;
import com.propease.entity.Unit;
import com.propease.enums.LeaseStatus;
import com.propease.enums.UnitStatus;
import com.propease.exception.ResourceNotFoundException;
import com.propease.repository.LeaseRepository;
import com.propease.repository.PropertyRepository;
import com.propease.repository.UnitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UnitService {

    private final UnitRepository unitRepository;
    private final PropertyRepository propertyRepository;
    private final LeaseRepository leaseRepository;

    public List<UnitResponse> getUnitsByProperty(UUID propertyId) {
        return unitRepository.findByPropertyId(propertyId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    public UnitResponse getUnit(UUID id) {
        Unit unit = unitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Unit not found: " + id));
        return mapToResponse(unit);
    }

    public UnitResponse createUnit(UUID propertyId, UnitRequest request) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found: " + propertyId));

        Unit unit = Unit.builder()
                .property(property)
                .unitNumber(request.getUnitNumber())
                .status(request.getStatus() != null ? UnitStatus.valueOf(request.getStatus().toUpperCase()) : UnitStatus.VACANT)
                .currentMarketRent(request.getCurrentMarketRent())
                .sqft(request.getSqft())
                .beds(request.getBeds())
                .baths(request.getBaths())
                .occupantsLimit(request.getOccupantsLimit())
                .amenities(request.getAmenities() != null ? String.join(",", request.getAmenities()) : null)
                .build();

        return mapToResponse(unitRepository.save(unit));
    }

    public UnitResponse updateUnit(UUID id, UnitRequest request) {
        Unit unit = unitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Unit not found: " + id));

        unit.setUnitNumber(request.getUnitNumber());
        if (request.getStatus() != null) {
            unit.setStatus(UnitStatus.valueOf(request.getStatus().toUpperCase()));
        }
        unit.setCurrentMarketRent(request.getCurrentMarketRent());
        unit.setSqft(request.getSqft());
        unit.setBeds(request.getBeds());
        unit.setBaths(request.getBaths());
        unit.setOccupantsLimit(request.getOccupantsLimit());
        if (request.getAmenities() != null) {
            unit.setAmenities(String.join(",", request.getAmenities()));
        }

        return mapToResponse(unitRepository.save(unit));
    }

    private UnitResponse mapToResponse(Unit unit) {
        // Find current tenant name from active lease
        String tenantName = null;
        List<Lease> leases = leaseRepository.findByUnitId(unit.getId());
        for (Lease lease : leases) {
            if (lease.getStatus() == LeaseStatus.ACTIVE) {
                LeaseTenant primary = lease.getTenants().stream()
                        .filter(lt -> Boolean.TRUE.equals(lt.getIsPrimary()))
                        .findFirst()
                        .orElse(lease.getTenants().isEmpty() ? null : lease.getTenants().get(0));
                if (primary != null) {
                    tenantName = primary.getProfile().getFirstName() + " " + primary.getProfile().getLastName();
                }
                break;
            }
        }

        List<String> amenities = unit.getAmenities() != null && !unit.getAmenities().isBlank()
                ? Arrays.asList(unit.getAmenities().split(","))
                : List.of();

        return UnitResponse.builder()
                .id(unit.getId())
                .propertyId(unit.getProperty().getId())
                .propertyName(unit.getProperty().getName())
                .unitNumber(unit.getUnitNumber())
                .status(unit.getStatus().name().toLowerCase())
                .currentMarketRent(unit.getCurrentMarketRent())
                .sqft(unit.getSqft())
                .beds(unit.getBeds())
                .baths(unit.getBaths())
                .occupantsLimit(unit.getOccupantsLimit())
                .amenities(amenities)
                .tenantName(tenantName)
                .build();
    }
}
