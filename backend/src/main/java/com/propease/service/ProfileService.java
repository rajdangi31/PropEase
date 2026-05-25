package com.propease.service;

import com.propease.dto.response.TenantResponse;
import com.propease.entity.Lease;
import com.propease.entity.LeaseTenant;
import com.propease.entity.Profile;
import com.propease.enums.LeaseStatus;
import com.propease.enums.Role;
import com.propease.exception.ResourceNotFoundException;
import com.propease.repository.LeaseTenantRepository;
import com.propease.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final LeaseTenantRepository leaseTenantRepository;

    public List<TenantResponse> getAllTenants(String search) {
        List<Profile> tenants;
        if (search != null && !search.isBlank()) {
            tenants = profileRepository
                    .findByRoleAndFirstNameContainingIgnoreCaseOrRoleAndLastNameContainingIgnoreCaseOrRoleAndEmailContainingIgnoreCase(
                            Role.TENANT, search, Role.TENANT, search, Role.TENANT, search);
        } else {
            tenants = profileRepository.findByRole(Role.TENANT);
        }

        return tenants.stream().map(this::mapToTenantResponse).toList();
    }

    public TenantResponse getTenant(UUID id) {
        Profile profile = profileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found: " + id));
        return mapToTenantResponse(profile);
    }

    private TenantResponse mapToTenantResponse(Profile profile) {
        // Find active lease info
        List<LeaseTenant> leaseLinks = leaseTenantRepository.findByProfileId(profile.getId());
        String unit = "";
        String moveIn = "";
        String leaseEnd = "";
        Long rent = 0L;
        String status = "Active";

        for (LeaseTenant lt : leaseLinks) {
            Lease lease = lt.getLease();
            if (lease.getStatus() == LeaseStatus.ACTIVE) {
                unit = lease.getUnit().getProperty().getName() + " · " + lease.getUnit().getUnitNumber();
                moveIn = lease.getStartDate().toString();
                leaseEnd = lease.getEndDate().toString();
                rent = lease.getMonthlyRent();
                break;
            }
        }

        return TenantResponse.builder()
                .id(profile.getId())
                .name(profile.getFirstName() + " " + profile.getLastName())
                .email(profile.getEmail())
                .phone(profile.getPhone())
                .unit(unit)
                .moveIn(moveIn)
                .leaseEnd(leaseEnd)
                .rent(rent)
                .status(status)
                .build();
    }
}
