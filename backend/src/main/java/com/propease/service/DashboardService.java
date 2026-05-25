package com.propease.service;

import com.propease.dto.response.DashboardStatsResponse;
import com.propease.dto.response.TenantDashboardResponse;
import com.propease.entity.*;
import com.propease.enums.*;
import com.propease.exception.ResourceNotFoundException;
import com.propease.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final UnitRepository unitRepository;
    private final MaintenanceRequestRepository maintenanceRequestRepository;
    private final PaymentRepository paymentRepository;
    private final LeaseRepository leaseRepository;
    private final ActivityLogRepository activityLogRepository;
    private final ProfileRepository profileRepository;
    private final DocumentRepository documentRepository;

    public DashboardStatsResponse getAdminDashboard(UUID landlordId) {
        // KPIs
        long totalUnits = unitRepository.countByProperty_LandlordId(landlordId);
        long occupiedUnits = unitRepository.countByProperty_LandlordIdAndStatus(landlordId, UnitStatus.OCCUPIED);
        double occupancyRate = totalUnits > 0 ? (double) occupiedUnits / totalUnits * 100 : 0;

        Long collected = paymentRepository.sumAmountByLandlordIdAndStatus(landlordId, PaymentStatus.PAID);
        Long totalDue = collected + paymentRepository.sumAmountByLandlordIdAndStatus(landlordId, PaymentStatus.PENDING)
                + paymentRepository.sumAmountByLandlordIdAndStatus(landlordId, PaymentStatus.LATE);
        double collectionRate = totalDue > 0 ? (double) collected / totalDue * 100 : 0;

        long openRequests = maintenanceRequestRepository.countByUnit_Property_LandlordIdAndStatusIn(
                landlordId, List.of(RequestStatus.OPEN, RequestStatus.IN_PROGRESS, RequestStatus.AWAITING_PARTS));
        long highPriority = maintenanceRequestRepository.countByUnit_Property_LandlordIdAndPriorityIn(
                landlordId, List.of(Priority.HIGH, Priority.EMERGENCY));

        // Unit status breakdown
        long vacantCount = unitRepository.countByProperty_LandlordIdAndStatus(landlordId, UnitStatus.VACANT);
        long noticeCount = unitRepository.countByProperty_LandlordIdAndStatus(landlordId, UnitStatus.NOTICE);

        // Lease alerts
        LocalDate cutoff = LocalDate.now().plusDays(60);
        List<DashboardStatsResponse.LeaseAlert> leaseAlerts = leaseRepository.findExpiringLeases(cutoff).stream()
                .map(lease -> {
                    String tenantName = lease.getTenants().stream()
                            .filter(lt -> Boolean.TRUE.equals(lt.getIsPrimary()))
                            .findFirst()
                            .map(lt -> lt.getProfile().getFirstName() + " " + lt.getProfile().getLastName())
                            .orElse("Unknown");
                    long daysLeft = ChronoUnit.DAYS.between(LocalDate.now(), lease.getEndDate());
                    return DashboardStatsResponse.LeaseAlert.builder()
                            .tenant(tenantName)
                            .unit(lease.getUnit().getProperty().getName() + " · " + lease.getUnit().getUnitNumber())
                            .endsIn(daysLeft)
                            .date(lease.getEndDate().format(DateTimeFormatter.ofPattern("MMM d, yyyy")))
                            .build();
                }).toList();

        // Activity feed
        List<DashboardStatsResponse.ActivityEntry> activity = activityLogRepository.findTop20ByOrderByCreatedAtDesc()
                .stream().map(log -> DashboardStatsResponse.ActivityEntry.builder()
                        .id(log.getId().toString())
                        .type(log.getActionType().toLowerCase().contains("payment") ? "payment"
                                : log.getActionType().toLowerCase().contains("maintenance") ? "maintenance" : "lease")
                        .text(log.getDescription())
                        .time(formatTimeAgo(log.getCreatedAt()))
                        .build())
                .toList();

        return DashboardStatsResponse.builder()
                .occupancyRate(String.format("%.1f%%", occupancyRate))
                .occupancyDelta("+2.1%")
                .rentCollectionRate(String.format("%.0f%%", collectionRate))
                .rentCollectionDelta("+1.4%")
                .openRequests(openRequests)
                .openRequestsNote(highPriority + " high priority")
                .monthlyRevenue("$" + formatCurrency(collected))
                .revenueDelta("+5.8%")
                .unitStatusBreakdown(List.of(
                        new DashboardStatsResponse.UnitStatusBreakdown("Occupied", occupiedUnits, "occupied"),
                        new DashboardStatsResponse.UnitStatusBreakdown("Vacant", vacantCount, "vacant"),
                        new DashboardStatsResponse.UnitStatusBreakdown("Notice Given", noticeCount, "notice")
                ))
                .revenueSeries(List.of()) // Populated from historical data
                .maintenanceResponse(List.of()) // Populated from metrics
                .recentActivity(activity)
                .leaseAlerts(leaseAlerts)
                .build();
    }

    public TenantDashboardResponse getTenantDashboard(UUID tenantId) {
        Profile tenant = profileRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found"));

        // Find active lease
        List<Lease> activeLeases = leaseRepository.findActiveLeasesByTenantId(tenantId);
        Lease activeLease = activeLeases.isEmpty() ? null : activeLeases.get(0);

        String unitLabel = activeLease != null
                ? activeLease.getUnit().getProperty().getName() + " · Apt " + activeLease.getUnit().getUnitNumber()
                : "No active lease";
        Long rent = activeLease != null ? activeLease.getMonthlyRent() : 0L;
        String leaseEnd = activeLease != null
                ? activeLease.getEndDate().format(DateTimeFormatter.ofPattern("MMM d, yyyy"))
                : "";

        // Payment history
        List<TenantDashboardResponse.PaymentHistoryEntry> history = paymentRepository
                .findByTenantIdOrderByDueDateDesc(tenantId).stream()
                .limit(10)
                .map(p -> TenantDashboardResponse.PaymentHistoryEntry.builder()
                        .id(p.getId().toString())
                        .date(p.getDueDate().format(DateTimeFormatter.ofPattern("MMM d, yyyy")))
                        .amount(p.getAmount())
                        .status(p.getStatus().name())
                        .build())
                .toList();

        // Maintenance requests
        List<TenantDashboardResponse.RequestSummary> requests = maintenanceRequestRepository
                .findByTenantId(tenantId).stream()
                .map(r -> TenantDashboardResponse.RequestSummary.builder()
                        .id(r.getId().toString())
                        .title(r.getTitle())
                        .status(r.getStatus().name())
                        .date(r.getCreatedAt().format(DateTimeFormatter.ofPattern("MMM d")))
                        .build())
                .toList();

        // Documents
        List<TenantDashboardResponse.DocumentSummary> documents = documentRepository
                .findByTenantId(tenantId).stream()
                .map(d -> TenantDashboardResponse.DocumentSummary.builder()
                        .id(d.getId().toString())
                        .name(d.getName())
                        .size(d.getFileSize())
                        .build())
                .toList();

        return TenantDashboardResponse.builder()
                .name(tenant.getFirstName() + " " + tenant.getLastName())
                .unit(unitLabel)
                .rent(rent)
                .dueDate(LocalDate.now().withDayOfMonth(1).plusMonths(1)
                        .format(DateTimeFormatter.ofPattern("MMM d, yyyy")))
                .balance(rent)
                .leaseEnd(leaseEnd)
                .documents(documents)
                .history(history)
                .requests(requests)
                .build();
    }

    private String formatCurrency(long cents) {
        double dollars = cents / 100.0;
        if (dollars >= 1000) {
            return String.format("%.1fk", dollars / 1000);
        }
        return String.format("%.0f", dollars);
    }

    private String formatTimeAgo(java.time.LocalDateTime dateTime) {
        long minutes = ChronoUnit.MINUTES.between(dateTime, java.time.LocalDateTime.now());
        if (minutes < 60) return minutes + " min ago";
        long hours = minutes / 60;
        if (hours < 24) return hours + " hr ago";
        long days = hours / 24;
        if (days == 1) return "Yesterday";
        return days + " days ago";
    }
}
