package com.propease.repository;

import com.propease.entity.MaintenanceRequest;
import com.propease.enums.Priority;
import com.propease.enums.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MaintenanceRequestRepository extends JpaRepository<MaintenanceRequest, UUID> {

    List<MaintenanceRequest> findByTenantId(UUID tenantId);

    List<MaintenanceRequest> findByStatus(RequestStatus status);

    List<MaintenanceRequest> findByPriority(Priority priority);

    List<MaintenanceRequest> findByUnit_Property_LandlordId(UUID landlordId);

    long countByUnit_Property_LandlordIdAndStatusIn(UUID landlordId, List<RequestStatus> statuses);

    long countByUnit_Property_LandlordIdAndPriorityIn(UUID landlordId, List<Priority> priorities);
}
