package com.propease.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@AllArgsConstructor
public class PaymentSummaryResponse {
    private Long collected;
    private Long pending;
    private Long late;
}
