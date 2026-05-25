package com.propease.repository;

import com.propease.entity.Payment;
import com.propease.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    List<Payment> findByTenantId(UUID tenantId);

    List<Payment> findByTenantIdOrderByDueDateDesc(UUID tenantId);

    List<Payment> findByStatus(PaymentStatus status);

    @Query("SELECT p FROM Payment p WHERE p.lease.unit.property.landlord.id = :landlordId ORDER BY p.dueDate DESC")
    List<Payment> findByLandlordId(@Param("landlordId") UUID landlordId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.lease.unit.property.landlord.id = :landlordId AND p.status = :status")
    Long sumAmountByLandlordIdAndStatus(@Param("landlordId") UUID landlordId, @Param("status") PaymentStatus status);
}
