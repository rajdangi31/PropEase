package com.propease.repository;

import com.propease.entity.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, UUID> {

    List<ActivityLog> findTop20ByActorIdOrderByCreatedAtDesc(UUID actorId);

    List<ActivityLog> findTop20ByOrderByCreatedAtDesc();
}
