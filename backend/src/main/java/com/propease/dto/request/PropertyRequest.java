package com.propease.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PropertyRequest {

    @NotBlank(message = "Property name is required")
    private String name;

    @NotBlank(message = "Address is required")
    private String address;

    private Double latitude;
    private Double longitude;
    private String description;
}
