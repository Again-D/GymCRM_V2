package com.gymcrm.settlement;

import com.gymcrm.member.Member;
import com.gymcrm.member.MemberService;
import com.gymcrm.membership.MemberMembership;
import com.gymcrm.membership.MembershipPurchaseService;
import com.gymcrm.product.Product;
import com.gymcrm.product.ProductService;
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
        assertEquals(2L, trainerA.completedClassCount());
        assertEquals(0, new BigDecimal("100000").compareTo(trainerA.payrollAmount()));

        TrainerPayrollSettlementService.TrainerPayrollRow trainerB = result.rows().stream()
                .filter(row -> row.trainerName().equals("Trainer-B"))
                .findFirst()
                .orElseThrow();
        assertEquals(1L, trainerB.completedClassCount());
        assertEquals(0, new BigDecimal("50000").compareTo(trainerB.payrollAmount()));
    }

    private MemberMembership purchasePtMembership() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Member member = memberService.create(new MemberService.MemberCreateRequest(
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
                "ACTIVE",
                null
        ));
        return purchaseService.purchase(new MembershipPurchaseService.PurchaseRequest(
                member.memberId(),
                product.productId(),
                null,
                LocalDate.now(),
                null,
                "CARD",
                null,
                null
        )).membership();
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
}
