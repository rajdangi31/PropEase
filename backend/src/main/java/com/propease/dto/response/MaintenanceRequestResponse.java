package com.propease.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
public class MaintenanceRequestResponse {
    private UUID id;
    private String title;
    private String description;
    private String unit;
    private String tenant;
    private String category;
    private String priority;
    private String status;
    private String assigned;
    private LocalDateTime createdAt;
    private List<LogEntry> logs;

    @Data
    @Builder
    @AllArgsConstructor
    public static class LogEntry {
        private UUID id;
        private String author;
        private String content;
        private Boolean isInternal;
        private LocalDateTime createdAt;
    }
}
