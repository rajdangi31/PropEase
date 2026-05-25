package com.propease.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.UUID;

@Data
public class MaintenanceRequestDto {

    @NotBlank(message = "Title is required")
    private String title;

    private String description;
    private String category;
    private String priority;
    private UUID unitId;
    private UUID assignedWorkerId;
}
