package com.propease.service;

import com.propease.dto.request.PropertyRequest;
import com.propease.dto.response.PropertyResponse;
import com.propease.entity.Profile;
import com.propease.entity.Property;
import com.propease.enums.UnitStatus;
import com.propease.exception.ResourceNotFoundException;
import com.propease.repository.ProfileRepository;
import com.propease.repository.PropertyRepository;
import com.propease.repository.UnitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PropertyService {

    private final PropertyRepository propertyRepository;
    private final ProfileRepository profileRepository;
    private final UnitRepository unitRepository;

    public List<PropertyResponse> getPropertiesByLandlord(UUID landlordId) {
        return propertyRepository.findByLandlordId(landlordId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<PropertyResponse> getAllProperties() {
        return propertyRepository.findAll().stream()
                .map(this::mapToResponse)
                .toList();
    }

    public PropertyResponse getProperty(UUID id) {
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found: " + id));
        return mapToResponse(property);
    }

    public PropertyResponse createProperty(UUID landlordId, PropertyRequest request) {
        Profile landlord = profileRepository.findById(landlordId)
                .orElseThrow(() -> new ResourceNotFoundException("Landlord not found"));

        Property property = Property.builder()
                .landlord(landlord)
                .name(request.getName())
                .address(request.getAddress())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .description(request.getDescription())
                .build();

        return mapToResponse(propertyRepository.save(property));
    }

    public PropertyResponse updateProperty(UUID id, PropertyRequest request) {
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found: " + id));

        property.setName(request.getName());
        property.setAddress(request.getAddress());
        property.setLatitude(request.getLatitude());
        property.setLongitude(request.getLongitude());
        property.setDescription(request.getDescription());

        return mapToResponse(propertyRepository.save(property));
    }

    public void deleteProperty(UUID id) {
        if (!propertyRepository.existsById(id)) {
            throw new ResourceNotFoundException("Property not found: " + id);
        }
        propertyRepository.deleteById(id);
    }

    private PropertyResponse mapToResponse(Property property) {
        long total = unitRepository.countByPropertyId(property.getId());
        long occupied = unitRepository.countByPropertyIdAndStatus(property.getId(), UnitStatus.OCCUPIED);

        return PropertyResponse.builder()
                .id(property.getId())
                .name(property.getName())
                .address(property.getAddress())
                .latitude(property.getLatitude())
                .longitude(property.getLongitude())
                .description(property.getDescription())
                .totalUnits((int) total)
                .occupiedUnits((int) occupied)
                .build();
    }
}
