package com.propease.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
public class UnitResponse {
    private UUID id;
    private UUID propertyId;
    private String propertyName;
    private String unitNumber;
    private String status;
    private Long currentMarketRent;
    private Integer sqft;
    private Integer beds;
    private Integer baths;
    private Integer occupantsLimit;
    private List<String> amenities;
    private String tenantName;
}
