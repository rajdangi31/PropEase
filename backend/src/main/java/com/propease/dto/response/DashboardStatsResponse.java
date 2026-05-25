package com.propease.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
@AllArgsConstructor
public class DashboardStatsResponse {

    // KPI cards
    private String occupancyRate;
    private String occupancyDelta;
    private String rentCollectionRate;
    private String rentCollectionDelta;
    private long openRequests;
    private String openRequestsNote;
    private String monthlyRevenue;
    private String revenueDelta;

    // Charts
    private List<RevenueSeries> revenueSeries;
    private List<UnitStatusBreakdown> unitStatusBreakdown;
    private List<MaintenanceResponseTime> maintenanceResponse;

    // Activity feed
    private List<ActivityEntry> recentActivity;

    // Lease alerts
    private List<LeaseAlert> leaseAlerts;

    @Data
    @Builder
    @AllArgsConstructor
    public static class RevenueSeries {
        private String month;
        private long revenue;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class UnitStatusBreakdown {
        private String name;
        private long value;
        private String key;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class MaintenanceResponseTime {
        private String day;
        private double hours;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class ActivityEntry {
        private String id;
        private String type;
        private String text;
        private String time;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class LeaseAlert {
        private String tenant;
        private String unit;
        private long endsIn;
        private String date;
    }
}
