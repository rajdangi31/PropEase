package com.propease.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
public class DocumentResponse {
    private UUID id;
    private String name;
    private String fileSize;
    private String type;
    private String status;
    private String uploadedBy;
}
