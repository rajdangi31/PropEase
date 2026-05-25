package com.propease.service;

import com.propease.entity.ActivityLog;
import com.propease.entity.Profile;
import com.propease.repository.ActivityLogRepository;
import com.propease.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ActivityLogService {

    private final ActivityLogRepository activityLogRepository;
    private final ProfileRepository profileRepository;

    public void log(UUID actorId, String actionType, String description) {
        Profile actor = profileRepository.findById(actorId).orElse(null);
        if (actor == null) return;

        ActivityLog log = ActivityLog.builder()
                .actor(actor)
                .actionType(actionType)
                .description(description)
                .build();

        activityLogRepository.save(log);
    }

    public void log(UUID actorId, String actionType, String description, String metadata) {
        Profile actor = profileRepository.findById(actorId).orElse(null);
        if (actor == null) return;

        ActivityLog log = ActivityLog.builder()
                .actor(actor)
                .actionType(actionType)
                .description(description)
                .metadata(metadata)
                .build();

        activityLogRepository.save(log);
    }
}
