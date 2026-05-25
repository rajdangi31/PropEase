package com.propease.repository;

import com.propease.entity.Unit;
import com.propease.enums.UnitStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UnitRepository extends JpaRepository<Unit, UUID> {

    List<Unit> findByPropertyId(UUID propertyId);

    long countByPropertyIdAndStatus(UUID propertyId, UnitStatus status);

    long countByPropertyId(UUID propertyId);

    long countByProperty_LandlordId(UUID landlordId);

    long countByProperty_LandlordIdAndStatus(UUID landlordId, UnitStatus status);
}
