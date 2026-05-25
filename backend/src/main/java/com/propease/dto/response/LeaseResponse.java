package com.propease.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
public class LeaseResponse {
    private UUID id;
    private UUID unitId;
    private String unitNumber;
    private String propertyName;
    private LocalDate startDate;
    private LocalDate endDate;
    private Long monthlyRent;
    private Long securityDeposit;
    private String status;
    private List<TenantSummary> tenants;

    @Data
    @Builder
    @AllArgsConstructor
    public static class TenantSummary {
        private UUID id;
        private String name;
        private String email;
        private boolean isPrimary;
    }
}
