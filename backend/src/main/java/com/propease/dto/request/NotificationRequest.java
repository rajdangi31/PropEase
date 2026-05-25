package com.propease.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class NotificationRequest {

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Body is required")
    private String body;

    private String type;

    /** Target audience: list of profile IDs, or null for all tenants */
    private List<UUID> recipientIds;

    /** Audience filter: property ID to send to all tenants in that property */
    private UUID propertyId;
}
