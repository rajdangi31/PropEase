package com.propease.config;

import com.propease.entity.*;
import com.propease.enums.*;
import com.propease.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final ProfileRepository profileRepository;
    private final PropertyRepository propertyRepository;
    private final UnitRepository unitRepository;
    private final LeaseRepository leaseRepository;
    private final LeaseTenantRepository leaseTenantRepository;
    private final PaymentRepository paymentRepository;
    private final MaintenanceRequestRepository maintenanceRequestRepository;
    private final NotificationRepository notificationRepository;
    private final ActivityLogRepository activityLogRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (profileRepository.count() > 0) {
            return; // Already seeded
        }

        // 1. Create Profiles
        Profile landlord = profileRepository.save(Profile.builder()
                .firstName("Admin")
                .lastName("User")
                .email("admin@propease.com")
                .password(passwordEncoder.encode("password123"))
                .role(Role.LANDLORD)
                .build());

        Profile sarah = createTenant("Sarah", "Chen", "sarah.chen@example.com", "(555) 010-1234");
        Profile marcus = createTenant("Marcus", "Hill", "marcus@example.com", "(555) 010-2222");
        Profile priya = createTenant("Priya", "Patel", "priya@example.com", "(555) 010-3333");
        Profile diego = createTenant("Diego", "Romero", "diego@example.com", "(555) 010-4444");
        Profile aisha = createTenant("Aisha", "Khan", "aisha@example.com", "(555) 010-5555");
        Profile tom = createTenant("Tom", "Becker", "tom@example.com", "(555) 010-6666");
        Profile maya = createTenant("Maya", "Singh", "maya@example.com", "(555) 010-7777");

        Profile workerJorge = profileRepository.save(Profile.builder()
                .firstName("Jorge")
                .lastName("Vega")
                .email("jorge@propease.com")
                .password(passwordEncoder.encode("password123"))
                .role(Role.MAINTENANCE)
                .build());

        Profile workerLiam = profileRepository.save(Profile.builder()
                .firstName("Liam")
                .lastName("O'Connor")
                .email("liam@propease.com")
                .password(passwordEncoder.encode("password123"))
                .role(Role.MAINTENANCE)
                .build());

        // 2. Create Properties
        Property mapleHeights = propertyRepository.save(Property.builder()
                .name("Maple Heights")
                .address("1200 Maple Ave, Brooklyn, NY")
                .landlord(landlord)
                .units(new ArrayList<>())
                .build());

        Property riverside = propertyRepository.save(Property.builder()
                .name("Riverside Lofts")
                .address("88 River St, Hoboken, NJ")
                .landlord(landlord)
                .units(new ArrayList<>())
                .build());

        Property sunset = propertyRepository.save(Property.builder()
                .name("Sunset Court")
                .address("455 Sunset Blvd, Jersey City, NJ")
                .landlord(landlord)
                .units(new ArrayList<>())
                .build());

        // 3. Create Units & Leases
        // Maple Heights 101 - Sarah
        Unit u101 = createUnit(mapleHeights, "101", UnitStatus.OCCUPIED, 2400L, 720, 1, 1);
        createLeaseAndLink(u101, sarah, 2400L, LocalDate.of(2023, 4, 1), LocalDate.of(2026, 3, 31));

        // Maple Heights 102 - Marcus
        Unit u102 = createUnit(mapleHeights, "102", UnitStatus.OCCUPIED, 2600L, 820, 2, 1);
        createLeaseAndLink(u102, marcus, 2600L, LocalDate.of(2022, 8, 15), LocalDate.of(2025, 8, 14));

        // Maple Heights 103 - Vacant
        createUnit(mapleHeights, "103", UnitStatus.VACANT, 2500L, 780, 1, 1);

        // Maple Heights 201 - Priya (Notice)
        Unit u201 = createUnit(mapleHeights, "201", UnitStatus.NOTICE, 2800L, 900, 2, 2);
        createLeaseAndLink(u201, priya, 2800L, LocalDate.of(2021, 6, 1), LocalDate.of(2025, 5, 31));

        // Maple Heights 202 - Diego
        Unit u202 = createUnit(mapleHeights, "202", UnitStatus.OCCUPIED, 2700L, 870, 2, 1);
        createLeaseAndLink(u202, diego, 2700L, LocalDate.of(2023, 11, 1), LocalDate.of(2025, 10, 31));

        // Maple Heights 203 - Aisha
        Unit u203 = createUnit(mapleHeights, "203", UnitStatus.OCCUPIED, 2750L, 880, 2, 2);
        createLeaseAndLink(u203, aisha, 2750L, LocalDate.of(2024, 1, 15), LocalDate.of(2026, 1, 14));

        // Riverside 1A - Tom
        Unit u1a = createUnit(riverside, "1A", UnitStatus.OCCUPIED, 3200L, 1100, 2, 2);
        createLeaseAndLink(u1a, tom, 3200L, LocalDate.of(2022, 3, 1), LocalDate.of(2025, 6, 30));

        // Riverside 1B - Vacant
        createUnit(riverside, "1B", UnitStatus.VACANT, 3100L, 1050, 2, 2);

        // Sunset 12 - Maya (Notice)
        Unit u12 = createUnit(sunset, "12", UnitStatus.NOTICE, 1950L, 600, 1, 1);
        createLeaseAndLink(u12, maya, 1950L, LocalDate.of(2024, 1, 1), LocalDate.of(2025, 12, 31));

        // 4. Create Payments
        createPayment(sarah, getActiveLease(sarah), 240000L, PaymentStatus.PAID);
        createPayment(marcus, getActiveLease(marcus), 260000L, PaymentStatus.PAID);
        createPayment(priya, getActiveLease(priya), 280000L, PaymentStatus.LATE);
        createPayment(diego, getActiveLease(diego), 270000L, PaymentStatus.PAID);
        createPayment(aisha, getActiveLease(aisha), 275000L, PaymentStatus.PENDING);
        createPayment(tom, getActiveLease(tom), 320000L, PaymentStatus.PAID);
        createPayment(maya, getActiveLease(maya), 195000L, PaymentStatus.PENDING);

        // 5. Create Maintenance Requests
        maintenanceRequestRepository.save(MaintenanceRequest.builder()
                .unit(u102).tenant(marcus)
                .title("Leaking kitchen faucet").category("Plumbing")
                .priority(Priority.MEDIUM).status(RequestStatus.OPEN)
                .build());

        maintenanceRequestRepository.save(MaintenanceRequest.builder()
                .unit(u1a).tenant(tom).assignedWorker(workerJorge)
                .title("AC not cooling").category("HVAC")
                .priority(Priority.HIGH).status(RequestStatus.IN_PROGRESS)
                .build());

        maintenanceRequestRepository.save(MaintenanceRequest.builder()
                .unit(u203).tenant(aisha).assignedWorker(workerLiam)
                .title("Outlet sparks in bedroom").category("Electrical")
                .priority(Priority.EMERGENCY).status(RequestStatus.IN_PROGRESS)
                .build());

        maintenanceRequestRepository.save(MaintenanceRequest.builder()
                .unit(u202).tenant(diego).assignedWorker(workerJorge)
                .title("Dishwasher won't drain").category("Appliance")
                .priority(Priority.LOW).status(RequestStatus.AWAITING_PARTS)
                .build());

        maintenanceRequestRepository.save(MaintenanceRequest.builder()
                .unit(u12).tenant(maya)
                .title("Broken blinds").category("Other")
                .priority(Priority.LOW).status(RequestStatus.RESOLVED)
                .build());

        maintenanceRequestRepository.save(MaintenanceRequest.builder()
                .unit(u101).tenant(sarah)
                .title("Hallway light out").category("Electrical")
                .priority(Priority.LOW).status(RequestStatus.OPEN)
                .build());

        // 6. Create Notifications
        notificationRepository.save(Notification.builder()
                .recipient(landlord).type(NotificationType.PAYMENT)
                .title("Rent received").body("Sarah Chen paid $2,400")
                .build());

        notificationRepository.save(Notification.builder()
                .recipient(landlord).type(NotificationType.MAINTENANCE)
                .title("New request").body("Leaking faucet in Unit 102")
                .build());

        notificationRepository.save(Notification.builder()
                .recipient(landlord).type(NotificationType.ANNOUNCEMENT)
                .title("Building notice posted").body("Water shutoff Sat 9–11am")
                .build());

        notificationRepository.save(Notification.builder()
                .recipient(landlord).type(NotificationType.PAYMENT)
                .title("Payment late").body("Priya Patel — $2,800 overdue")
                .build());

        // 7. Create Activity Logs
        activityLogRepository.save(ActivityLog.builder()
                .actor(sarah).actionType("payment")
                .description("Sarah Chen paid $2,400 rent")
                .build());

        activityLogRepository.save(ActivityLog.builder()
                .actor(marcus).actionType("maintenance")
                .description("New maintenance: Leaking faucet — Unit 102")
                .build());

        activityLogRepository.save(ActivityLog.builder()
                .actor(priya).actionType("lease")
                .description("Lease for Priya Patel expires in 45 days")
                .build());

        activityLogRepository.save(ActivityLog.builder()
                .actor(diego).actionType("payment")
                .description("Diego Romero paid $2,700 rent")
                .build());

        activityLogRepository.save(ActivityLog.builder()
                .actor(workerJorge).actionType("maintenance")
                .description("Resolved: HVAC repair — Unit 1A")
                .build());
    }

    private Profile createTenant(String first, String last, String email, String phone) {
        return profileRepository.save(Profile.builder()
                .firstName(first)
                .lastName(last)
                .email(email)
                .phone(phone)
                .password(passwordEncoder.encode("password123"))
                .role(Role.TENANT)
                .build());
    }

    private Unit createUnit(Property p, String number, UnitStatus status, Long rent, int sqft, int beds, int baths) {
        return unitRepository.save(Unit.builder()
                .property(p)
                .unitNumber(number)
                .status(status)
                .currentMarketRent(rent * 100)
                .sqft(sqft)
                .beds(beds)
                .baths(baths)
                .build());
    }

    private void createLeaseAndLink(Unit u, Profile tenant, Long rent, LocalDate start, LocalDate end) {
        Lease lease = leaseRepository.save(Lease.builder()
                .unit(u)
                .startDate(start)
                .endDate(end)
                .monthlyRent(rent * 100)
                .status(LeaseStatus.ACTIVE)
                .tenants(new ArrayList<>())
                .build());

        LeaseTenant lt = leaseTenantRepository.save(LeaseTenant.builder()
                .lease(lease)
                .profile(tenant)
                .isPrimary(true)
                .build());

        lease.getTenants().add(lt);
    }

    private Lease getActiveLease(Profile p) {
        return leaseTenantRepository.findByProfileId(p.getId()).get(0).getLease();
    }

    private void createPayment(Profile tenant, Lease lease, Long amount, PaymentStatus status) {
        paymentRepository.save(Payment.builder()
                .tenant(tenant)
                .lease(lease)
                .amount(amount)
                .category(PaymentCategory.RENT)
                .dueDate(LocalDate.now().withDayOfMonth(1))
                .status(status)
                .paidDate(status == PaymentStatus.PAID ? LocalDate.now().minusDays(2) : null)
                .build());
    }
}
