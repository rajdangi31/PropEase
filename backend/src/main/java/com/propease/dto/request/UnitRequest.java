package com.propease.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class UnitRequest {

    @NotBlank(message = "Unit number is required")
    private String unitNumber;

    private String status;
    private Long currentMarketRent;
    private Integer sqft;
    private Integer beds;
    private Integer baths;
    private Integer occupantsLimit;
    private List<String> amenities;
}
