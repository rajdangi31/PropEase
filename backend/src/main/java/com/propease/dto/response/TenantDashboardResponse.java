package com.propease.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
public class TenantDashboardResponse {
    private String name;
    private String unit;
    private Long rent;
    private String dueDate;
    private Long balance;
    private String leaseEnd;

    private List<DocumentSummary> documents;
    private List<PaymentHistoryEntry> history;
    private List<RequestSummary> requests;

    @Data
    @Builder
    @AllArgsConstructor
    public static class DocumentSummary {
        private String id;
        private String name;
        private String size;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class PaymentHistoryEntry {
        private String id;
        private String date;
        private Long amount;
        private String status;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class RequestSummary {
        private String id;
        private String title;
        private String status;
        private String date;
    }
}
