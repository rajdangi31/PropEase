package com.propease.controller;

import com.propease.dto.request.NotificationRequest;
import com.propease.dto.response.NotificationResponse;
import com.propease.entity.Profile;
import com.propease.repository.ProfileRepository;
import com.propease.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final ProfileRepository profileRepository;

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getNotifications(
            @AuthenticationPrincipal UserDetails userDetails) {
        Profile profile = profileRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(notificationService.getNotifications(profile.getId()));
    }

    @PostMapping("/announce")
    public ResponseEntity<Void> sendAnnouncement(@Valid @RequestBody NotificationRequest request) {
        notificationService.sendAnnouncement(request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable UUID id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/mark-all-read")
    public ResponseEntity<Void> markAllAsRead(@AuthenticationPrincipal UserDetails userDetails) {
        Profile profile = profileRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        notificationService.markAllAsRead(profile.getId());
        return ResponseEntity.ok().build();
    }
}
