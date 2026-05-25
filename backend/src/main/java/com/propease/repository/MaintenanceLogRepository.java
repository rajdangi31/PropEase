package com.propease.repository;

import com.propease.entity.MaintenanceLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MaintenanceLogRepository extends JpaRepository<MaintenanceLog, UUID> {

    List<MaintenanceLog> findByRequestIdOrderByCreatedAtAsc(UUID requestId);
}
