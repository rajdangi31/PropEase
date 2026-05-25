package com.propease.repository;

import com.propease.entity.Lease;
import com.propease.enums.LeaseStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface LeaseRepository extends JpaRepository<Lease, UUID> {

    List<Lease> findByStatus(LeaseStatus status);

    List<Lease> findByUnitId(UUID unitId);

    @Query("SELECT l FROM Lease l WHERE l.status = 'ACTIVE' AND l.endDate <= :cutoff")
    List<Lease> findExpiringLeases(@Param("cutoff") LocalDate cutoff);

    @Query("SELECT l FROM Lease l JOIN l.tenants lt WHERE lt.profile.id = :profileId AND l.status = 'ACTIVE'")
    List<Lease> findActiveLeasesByTenantId(@Param("profileId") UUID profileId);

    @Query("SELECT l FROM Lease l WHERE l.unit.property.landlord.id = :landlordId")
    List<Lease> findByLandlordId(@Param("landlordId") UUID landlordId);
}
