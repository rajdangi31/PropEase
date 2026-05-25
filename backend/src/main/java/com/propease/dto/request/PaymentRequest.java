package com.propease.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class PaymentRequest {

    private UUID leaseId;

    @NotNull(message = "Amount is required")
    private Long amount;

    private String category;
    private LocalDate dueDate;
    private String transactionId;
}
