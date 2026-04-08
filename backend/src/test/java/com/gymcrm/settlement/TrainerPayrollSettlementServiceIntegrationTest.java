package com.gymcrm.settlement;

import com.gymcrm.member.dto.request.MemberCreateRequest;
import com.gymcrm.member.entity.Member;
import com.gymcrm.member.service.MemberService;
import com.gymcrm.membership.entity.MemberMembership;
import com.gymcrm.membership.service.MembershipPurchaseService;
import com.gymcrm.product.entity.Product;
import com.gymcrm.product.service.ProductService;
import com.gymcrm.settlement.service.TrainerPayrollSettlementService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest(properties = {
        "DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev",
        "DB_USERNAME=gymcrm",
        "DB_PASSWORD=gymcrm"
})
@ActiveProfiles("dev")
class TrainerPayrollSettlementServiceIntegrationTest {

    @Autowired
    private TrainerPayrollSettlementService service;

    @Autowired
    private MemberService memberService;

    @Autowired
    private ProductService productService;

    @Autowired
    private MembershipPurchaseService purchaseService;

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    @Transactional
    void monthlyPayrollAggregatesCompletedPtSessionsByTrainerAndAppliesUnitPrice() {
        YearMonth targetMonth = YearMonth.now(ZoneOffset.UTC).minusMonths(1);
        BigDecimal unitPrice = new BigDecimal("50000");

        MemberMembership membership1 = purchasePtMembership();
        MemberMembership membership2 = purchasePtMembership();
        MemberMembership membership3 = purchasePtMembership();
        MemberMembership membership4 = purchasePtMembership();

        long trainerAKlass1 = insertSchedule("PT", "Trainer-A", targetMonth.atDay(5));
        long trainerAKlass2 = insertSchedule("PT", "Trainer-A", targetMonth.atDay(12));
        long trainerBKlass1 = insertSchedule("PT", "Trainer-B", targetMonth.atDay(19));
        long trainerBGx = insertSchedule("GX", "Trainer-B", targetMonth.atDay(20));

        insertReservation(membership1, trainerAKlass1, "COMPLETED", targetMonth.atDay(5));
        insertReservation(membership2, trainerAKlass2, "COMPLETED", targetMonth.atDay(12));
        insertReservation(membership3, trainerBKlass1, "COMPLETED", targetMonth.atDay(19));
        insertReservation(membership4, trainerBGx, "COMPLETED", targetMonth.atDay(20)); // GX: should be excluded
        insertReservation(membership4, trainerBKlass1, "CANCELLED", targetMonth.atDay(21)); // cancelled: excluded

        TrainerPayrollSettlementService.MonthlyPayrollResult result = service.getMonthlyPayroll(
                new TrainerPayrollSettlementService.MonthlyPayrollQuery(targetMonth, unitPrice)
        );

        assertEquals(2, result.rows().size());
        assertEquals(3L, result.totalCompletedClassCount());
        assertEquals(0, new BigDecimal("150000").compareTo(result.totalPayrollAmount()));

        TrainerPayrollSettlementService.TrainerPayrollRow trainerA = result.rows().stream()
                .filter(row -> row.trainerName().equals("Trainer-A"))
                .findFirst()
                .orElseThrow();
        assertEquals(null, trainerA.settlementId());
        assertEquals(2L, trainerA.completedClassCount());
        assertEquals(0, new BigDecimal("100000").compareTo(trainerA.payrollAmount()));

        TrainerPayrollSettlementService.TrainerPayrollRow trainerB = result.rows().stream()
                .filter(row -> row.trainerName().equals("Trainer-B"))
                .findFirst()
                .orElseThrow();
        assertEquals(1L, trainerB.completedClassCount());
        assertEquals(0, new BigDecimal("50000").compareTo(trainerB.payrollAmount()));
    }

    @Test
    @Transactional
    void monthlyPayrollUsesBusinessTimezoneMonthBoundaries() {
        YearMonth targetMonth = YearMonth.of(2026, 3);
        BigDecimal unitPrice = new BigDecimal("50000");
        String trainerName = "Trainer-KST-" + UUID.randomUUID().toString().substring(0, 6);

        MemberMembership includedMembership = purchasePtMembership();
        MemberMembership excludedMembership = purchasePtMembership();

        long includedSchedule = insertSchedule("PT", trainerName, LocalDate.of(2026, 3, 1));
        long excludedSchedule = insertSchedule("PT", trainerName, LocalDate.of(2026, 4, 1));

        insertReservationAt(includedMembership, includedSchedule, "COMPLETED",
                OffsetDateTime.parse("2026-02-28T15:30:00Z"), null);
        insertReservationAt(excludedMembership, excludedSchedule, "COMPLETED",
                OffsetDateTime.parse("2026-03-31T15:30:00Z"), null);

        TrainerPayrollSettlementService.MonthlyPayrollResult result = service.getMonthlyPayroll(
                new TrainerPayrollSettlementService.MonthlyPayrollQuery(targetMonth, unitPrice)
        );

        TrainerPayrollSettlementService.TrainerPayrollRow trainerRow = result.rows().stream()
                .filter(row -> row.trainerName().equals(trainerName))
                .findFirst()
                .orElseThrow();
        assertEquals(1L, trainerRow.completedClassCount());
        assertEquals(0, unitPrice.compareTo(trainerRow.payrollAmount()));
    }

    @Test
    @Transactional
    void monthlyPayrollReturnsDraftStatusForUnconfirmedMonth() {
        YearMonth targetMonth = YearMonth.of(2026, 3);

        TrainerPayrollSettlementService.MonthlyPayrollResult result = service.getMonthlyPayroll(
                new TrainerPayrollSettlementService.MonthlyPayrollQuery(targetMonth, new BigDecimal("50000"))
        );

        assertEquals("DRAFT", result.settlementStatus());
        assertEquals(null, result.confirmedAt());
    }

    private MemberMembership purchasePtMembership() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Member member = memberService.create(new MemberCreateRequest(
                "SAL-PAY-" + suffix,
                "010-5" + suffix.substring(0, 3) + "-" + suffix.substring(3, 7),
                null,
                null,
                null,
                "ACTIVE",
                LocalDate.now(),
                true,
                false,
                null
        ));
        Product product = productService.create(new ProductService.ProductCreateRequest(
                "SAL-PT-" + suffix,
                "PT",
                "COUNT",
                new BigDecimal("100000"),
                null,
                20,
                true,
                30,
                1,
                false,
                false,
                "ACTIVE",
                null
        ));
        return purchaseService.purchase(new MembershipPurchaseService.PurchaseRequest(
                member.memberId(),
                product.productId(),
                createTrainerUser(),
                LocalDate.now(),
                null,
                "CARD",
                null,
                null
        )).membership();
    }

    private long createTrainerUser() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long userId = jdbcClient.sql("""
                INSERT INTO users (
                    center_id, login_id, password_hash, user_name, user_status,
                    is_deleted, created_at, created_by, updated_at, updated_by
                ) VALUES (
                    1, :loginId, :passwordHash, :displayName, 'ACTIVE',
                    FALSE, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP, 1
                )
                RETURNING user_id
                """)
                .param("loginId", "trainer-payroll-" + suffix)
                .param("passwordHash", "noop")
                .param("displayName", "Trainer " + suffix)
                .query(Long.class)
                .single();
        replaceUserRole(userId, "ROLE_TRAINER");
        return userId;
    }

    private void replaceUserRole(Long userId, String roleCode) {
        jdbcClient.sql("DELETE FROM user_roles WHERE user_id = :userId")
                .param("userId", userId)
                .update();
        jdbcClient.sql("""
                INSERT INTO user_roles (user_id, role_id, created_at, created_by)
                SELECT :userId, role_id, CURRENT_TIMESTAMP, 1
                FROM roles
                WHERE role_code = :roleCode
                """)
                .param("userId", userId)
                .param("roleCode", roleCode)
                .update();
    }

    private long insertSchedule(String scheduleType, String trainerName, LocalDate date) {
        OffsetDateTime startAt = date.atTime(10, 0).atOffset(ZoneOffset.UTC);
        OffsetDateTime endAt = date.atTime(11, 0).atOffset(ZoneOffset.UTC);
        return jdbcClient.sql("""
                INSERT INTO trainer_schedules (
                    center_id, schedule_type, trainer_name, slot_title,
                    start_at, end_at, capacity, current_count, memo,
                    created_by, updated_by
                )
                VALUES (
                    1, :scheduleType, :trainerName, :slotTitle,
                    :startAt, :endAt, 10, 0, NULL,
                    0, 0
                )
                RETURNING schedule_id
                """)
                .param("scheduleType", scheduleType)
                .param("trainerName", trainerName)
                .param("slotTitle", scheduleType + " slot")
                .param("startAt", startAt)
                .param("endAt", endAt)
                .query(Long.class)
                .single();
    }

    private void insertReservation(
            MemberMembership membership,
            long scheduleId,
            String reservationStatus,
            LocalDate date
    ) {
        OffsetDateTime reservedAt = date.atTime(9, 0).atOffset(ZoneOffset.UTC);
        OffsetDateTime completedAt = "COMPLETED".equals(reservationStatus) ? date.atTime(11, 0).atOffset(ZoneOffset.UTC) : null;
        OffsetDateTime cancelledAt = "CANCELLED".equals(reservationStatus) ? date.atTime(9, 30).atOffset(ZoneOffset.UTC) : null;

        jdbcClient.sql("""
                INSERT INTO reservations (
                    center_id, member_id, membership_id, schedule_id,
                    reservation_status, reserved_at, cancelled_at, completed_at,
                    created_by, updated_by
                )
                VALUES (
                    1, :memberId, :membershipId, :scheduleId,
                    :reservationStatus, :reservedAt, :cancelledAt, :completedAt,
                    0, 0
                )
                """)
                .param("memberId", membership.memberId())
                .param("membershipId", membership.membershipId())
                .param("scheduleId", scheduleId)
                .param("reservationStatus", reservationStatus)
                .param("reservedAt", reservedAt)
                .param("cancelledAt", cancelledAt)
                .param("completedAt", completedAt)
                .update();
    }

    private void insertReservationAt(
            MemberMembership membership,
            long scheduleId,
            String reservationStatus,
            OffsetDateTime completedAt,
            OffsetDateTime cancelledAt
    ) {
        OffsetDateTime reservedAt = completedAt != null ? completedAt.minusHours(2) : cancelledAt.minusMinutes(30);

        jdbcClient.sql("""
                INSERT INTO reservations (
                    center_id, member_id, membership_id, schedule_id,
                    reservation_status, reserved_at, cancelled_at, completed_at,
                    created_by, updated_by
                )
                VALUES (
                    1, :memberId, :membershipId, :scheduleId,
                    :reservationStatus, :reservedAt, :cancelledAt, :completedAt,
                    0, 0
                )
                """)
                .param("memberId", membership.memberId())
                .param("membershipId", membership.membershipId())
                .param("scheduleId", scheduleId)
                .param("reservationStatus", reservationStatus)
                .param("reservedAt", reservedAt)
                .param("cancelledAt", cancelledAt)
                .param("completedAt", completedAt)
                .update();
    }
}
