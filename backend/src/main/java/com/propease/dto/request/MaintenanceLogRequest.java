package com.propease.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class MaintenanceLogRequest {

    @NotBlank(message = "Content is required")
    private String content;

    private Boolean isInternal;
}
