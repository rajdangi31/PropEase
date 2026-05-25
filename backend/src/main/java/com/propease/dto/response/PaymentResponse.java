package com.propease.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
public class PaymentResponse {
    private UUID id;
    private String tenant;
    private String unit;
    private Long amount;
    private String category;
    private LocalDate dueDate;
    private LocalDate paidDate;
    private String status;
    private String transactionId;
}
