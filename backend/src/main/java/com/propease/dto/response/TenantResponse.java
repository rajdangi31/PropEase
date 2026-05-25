package com.propease.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
public class TenantResponse {
    private UUID id;
    private String name;
    private String email;
    private String phone;
    private String unit;
    private String moveIn;
    private String leaseEnd;
    private Long rent;
    private String status;
}
