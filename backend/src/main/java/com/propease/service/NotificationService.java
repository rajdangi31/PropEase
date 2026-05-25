package com.propease.service;

import com.propease.dto.request.NotificationRequest;
import com.propease.dto.response.NotificationResponse;
import com.propease.entity.Notification;
import com.propease.entity.Profile;
import com.propease.enums.NotificationType;
import com.propease.exception.ResourceNotFoundException;
import com.propease.repository.NotificationRepository;
import com.propease.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final ProfileRepository profileRepository;

    public List<NotificationResponse> getNotifications(UUID recipientId) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(recipientId).stream()
                .map(this::mapToResponse).toList();
    }

    public long getUnreadCount(UUID recipientId) {
        return notificationRepository.countByRecipientIdAndIsReadFalse(recipientId);
    }

    public void sendAnnouncement(NotificationRequest request) {
        NotificationType type = request.getType() != null
                ? NotificationType.valueOf(request.getType().toUpperCase())
                : NotificationType.ANNOUNCEMENT;

        List<Profile> recipients;
        if (request.getRecipientIds() != null && !request.getRecipientIds().isEmpty()) {
            recipients = profileRepository.findAllById(request.getRecipientIds());
        } else {
            recipients = profileRepository.findByRole(com.propease.enums.Role.TENANT);
        }

        for (Profile recipient : recipients) {
            Notification notification = Notification.builder()
                    .recipient(recipient)
                    .type(type)
                    .title(request.getTitle())
                    .body(request.getBody())
                    .build();
            notificationRepository.save(notification);
        }
    }

    public void markAsRead(UUID notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        notification.setIsRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(UUID recipientId) {
        notificationRepository.markAllAsRead(recipientId);
    }

    private NotificationResponse mapToResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .type(notification.getType().name().toLowerCase())
                .title(notification.getTitle())
                .body(notification.getBody())
                .isRead(notification.getIsRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
