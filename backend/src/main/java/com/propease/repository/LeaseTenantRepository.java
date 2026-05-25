package com.propease.repository;

import com.propease.entity.LeaseTenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LeaseTenantRepository extends JpaRepository<LeaseTenant, UUID> {

    List<LeaseTenant> findByLeaseId(UUID leaseId);

    List<LeaseTenant> findByProfileId(UUID profileId);
}
