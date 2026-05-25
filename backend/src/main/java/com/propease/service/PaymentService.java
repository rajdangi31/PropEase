package com.propease.service;

import com.propease.dto.request.PaymentRequest;
import com.propease.dto.response.PaymentResponse;
import com.propease.dto.response.PaymentSummaryResponse;
import com.propease.entity.Lease;
import com.propease.entity.Payment;
import com.propease.entity.Profile;
import com.propease.enums.PaymentCategory;
import com.propease.enums.PaymentStatus;
import com.propease.exception.ResourceNotFoundException;
import com.propease.repository.LeaseRepository;
import com.propease.repository.PaymentRepository;
import com.propease.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final LeaseRepository leaseRepository;
    private final ProfileRepository profileRepository;

    public List<PaymentResponse> getAllPayments() {
        return paymentRepository.findAll().stream().map(this::mapToResponse).toList();
    }

    public List<PaymentResponse> getPaymentsByLandlord(UUID landlordId) {
        return paymentRepository.findByLandlordId(landlordId).stream().map(this::mapToResponse).toList();
    }

    public List<PaymentResponse> getPaymentsByTenant(UUID tenantId) {
        return paymentRepository.findByTenantIdOrderByDueDateDesc(tenantId).stream()
                .map(this::mapToResponse).toList();
    }

    public PaymentSummaryResponse getPaymentSummary(UUID landlordId) {
        Long collected = paymentRepository.sumAmountByLandlordIdAndStatus(landlordId, PaymentStatus.PAID);
        Long pending = paymentRepository.sumAmountByLandlordIdAndStatus(landlordId, PaymentStatus.PENDING);
        Long late = paymentRepository.sumAmountByLandlordIdAndStatus(landlordId, PaymentStatus.LATE);

        return PaymentSummaryResponse.builder()
                .collected(collected)
                .pending(pending)
                .late(late)
                .build();
    }

    public PaymentResponse createPayment(PaymentRequest request, UUID tenantId) {
        Lease lease = leaseRepository.findById(request.getLeaseId())
                .orElseThrow(() -> new ResourceNotFoundException("Lease not found"));
        Profile tenant = profileRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found"));

        Payment payment = Payment.builder()
                .lease(lease)
                .tenant(tenant)
                .amount(request.getAmount())
                .category(request.getCategory() != null
                        ? PaymentCategory.valueOf(request.getCategory().toUpperCase())
                        : PaymentCategory.RENT)
                .dueDate(request.getDueDate() != null ? request.getDueDate() : LocalDate.now())
                .status(PaymentStatus.PENDING)
                .transactionId(request.getTransactionId())
                .build();

        return mapToResponse(paymentRepository.save(payment));
    }

    public PaymentResponse makePayment(UUID tenantId, PaymentRequest request) {
        Lease lease;
        if (request.getLeaseId() != null) {
            lease = leaseRepository.findById(request.getLeaseId())
                    .orElseThrow(() -> new ResourceNotFoundException("Lease not found"));
        } else {
            List<Lease> activeLeases = leaseRepository.findActiveLeasesByTenantId(tenantId);
            if (activeLeases.isEmpty()) {
                throw new ResourceNotFoundException("No active lease found for tenant");
            }
            lease = activeLeases.get(0);
        }
        
        Profile tenant = profileRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found"));

        Payment payment = Payment.builder()
                .lease(lease)
                .tenant(tenant)
                .amount(request.getAmount())
                .category(PaymentCategory.RENT)
                .dueDate(request.getDueDate() != null ? request.getDueDate() : LocalDate.now())
                .paidDate(LocalDate.now())
                .status(PaymentStatus.PAID)
                .transactionId("TXN_" + UUID.randomUUID().toString().substring(0, 8))
                .build();

        return mapToResponse(paymentRepository.save(payment));
    }

    private PaymentResponse mapToResponse(Payment payment) {
        String tenantName = payment.getTenant().getFirstName() + " " + payment.getTenant().getLastName();
        String unitLabel = payment.getLease().getUnit().getProperty().getName()
                + " · " + payment.getLease().getUnit().getUnitNumber();

        return PaymentResponse.builder()
                .id(payment.getId())
                .tenant(tenantName)
                .unit(unitLabel)
                .amount(payment.getAmount())
                .category(payment.getCategory().name())
                .dueDate(payment.getDueDate())
                .paidDate(payment.getPaidDate())
                .status(payment.getStatus().name())
                .transactionId(payment.getTransactionId())
                .build();
    }
}
