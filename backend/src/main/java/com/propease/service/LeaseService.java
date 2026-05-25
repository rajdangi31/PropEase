package com.propease.service;

import com.propease.dto.request.LeaseRequest;
import com.propease.dto.response.LeaseResponse;
import com.propease.entity.*;
import com.propease.enums.LeaseStatus;
import com.propease.exception.ResourceNotFoundException;
import com.propease.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LeaseService {

    private final LeaseRepository leaseRepository;
    private final UnitRepository unitRepository;
    private final ProfileRepository profileRepository;
    private final LeaseTenantRepository leaseTenantRepository;

    public List<LeaseResponse> getAllLeases() {
        return leaseRepository.findAll().stream().map(this::mapToResponse).toList();
    }

    public List<LeaseResponse> getLeasesByLandlord(UUID landlordId) {
        return leaseRepository.findByLandlordId(landlordId).stream().map(this::mapToResponse).toList();
    }

    public LeaseResponse getLease(UUID id) {
        Lease lease = leaseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lease not found: " + id));
        return mapToResponse(lease);
    }

    @Transactional
    public LeaseResponse createLease(LeaseRequest request) {
        Unit unit = unitRepository.findById(request.getUnitId())
                .orElseThrow(() -> new ResourceNotFoundException("Unit not found"));

        Lease lease = Lease.builder()
                .unit(unit)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .monthlyRent(request.getMonthlyRent())
                .securityDeposit(request.getSecurityDeposit())
                .status(request.getStatus() != null ? LeaseStatus.valueOf(request.getStatus().toUpperCase()) : LeaseStatus.ACTIVE)
                .tenants(new ArrayList<>())
                .build();

        lease = leaseRepository.save(lease);

        // Link tenants
        if (request.getTenantIds() != null) {
            for (UUID tenantId : request.getTenantIds()) {
                Profile tenant = profileRepository.findById(tenantId)
                        .orElseThrow(() -> new ResourceNotFoundException("Tenant not found: " + tenantId));
                LeaseTenant lt = LeaseTenant.builder()
                        .lease(lease)
                        .profile(tenant)
                        .isPrimary(tenantId.equals(request.getPrimaryTenantId()))
                        .build();
                leaseTenantRepository.save(lt);
                lease.getTenants().add(lt);
            }
        }

        return mapToResponse(lease);
    }

    public LeaseResponse updateLease(UUID id, LeaseRequest request) {
        Lease lease = leaseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lease not found: " + id));

        lease.setStartDate(request.getStartDate());
        lease.setEndDate(request.getEndDate());
        lease.setMonthlyRent(request.getMonthlyRent());
        lease.setSecurityDeposit(request.getSecurityDeposit());
        if (request.getStatus() != null) {
            lease.setStatus(LeaseStatus.valueOf(request.getStatus().toUpperCase()));
        }

        return mapToResponse(leaseRepository.save(lease));
    }

    public List<LeaseResponse> getExpiringLeases(int days) {
        LocalDate cutoff = LocalDate.now().plusDays(days);
        return leaseRepository.findExpiringLeases(cutoff).stream().map(this::mapToResponse).toList();
    }

    private LeaseResponse mapToResponse(Lease lease) {
        List<LeaseResponse.TenantSummary> tenants = lease.getTenants().stream()
                .map(lt -> LeaseResponse.TenantSummary.builder()
                        .id(lt.getProfile().getId())
                        .name(lt.getProfile().getFirstName() + " " + lt.getProfile().getLastName())
                        .email(lt.getProfile().getEmail())
                        .isPrimary(Boolean.TRUE.equals(lt.getIsPrimary()))
                        .build())
                .toList();

        return LeaseResponse.builder()
                .id(lease.getId())
                .unitId(lease.getUnit().getId())
                .unitNumber(lease.getUnit().getUnitNumber())
                .propertyName(lease.getUnit().getProperty().getName())
                .startDate(lease.getStartDate())
                .endDate(lease.getEndDate())
                .monthlyRent(lease.getMonthlyRent())
                .securityDeposit(lease.getSecurityDeposit())
                .status(lease.getStatus().name())
                .tenants(tenants)
                .build();
    }
}
