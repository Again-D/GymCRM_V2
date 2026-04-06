package com.gymcrm.settlement;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.member.dto.request.MemberCreateRequest;
import com.gymcrm.member.entity.Member;
import com.gymcrm.member.service.MemberService;
import com.gymcrm.membership.entity.MemberMembership;
import com.gymcrm.membership.service.MembershipPurchaseService;
import com.gymcrm.product.entity.Product;
import com.gymcrm.product.service.ProductService;
import com.gymcrm.settlement.service.TrainerPayrollSettlementService;
import com.gymcrm.settlement.service.TrainerSettlementLifecycleService;
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
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest(properties = {
        "DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev",
        "DB_USERNAME=gymcrm",
        "DB_PASSWORD=gymcrm"
})
@ActiveProfiles("dev")
class TrainerSettlementLifecycleServiceIntegrationTest {

    @Autowired
    private TrainerSettlementLifecycleService lifecycleService;

    @Autowired
    private TrainerPayrollSettlementService payrollSettlementService;

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
    void confirmMonthlySettlementPersistsRowsAndReflectsConfirmedStatusOnSubsequentQuery() {
        YearMonth targetMonth = YearMonth.of(2026, 3);
        BigDecimal unitPrice = new BigDecimal("50000");
        MemberMembership membership1 = purchasePtMembership();
        MemberMembership membership2 = purchasePtMembership();

        long trainerSchedule1 = insertSchedule("PT", "Trainer-Confirm-A", targetMonth.atDay(5));
        long trainerSchedule2 = insertSchedule("PT", "Trainer-Confirm-B", targetMonth.atDay(8));

        insertReservation(membership1, trainerSchedule1, "COMPLETED", targetMonth.atDay(5));
        insertReservation(membership2, trainerSchedule2, "COMPLETED", targetMonth.atDay(8));

        TrainerPayrollSettlementService.MonthlyPayrollResult confirmed = lifecycleService.confirmMonthlySettlement(
                new TrainerPayrollSettlementService.MonthlyPayrollQuery(targetMonth, unitPrice)
        );

        assertEquals("CONFIRMED", confirmed.settlementStatus());
        assertEquals(2, confirmed.rows().size());
        assertEquals(2L, jdbcClient.sql("""
                SELECT COUNT(*)
                FROM trainer_settlements
                WHERE center_id = 1
                  AND settlement_month = :settlementMonth
                  AND is_deleted = FALSE
                """)
                .param("settlementMonth", targetMonth.atDay(1))
                .query(Long.class)
                .single());

        TrainerPayrollSettlementService.MonthlyPayrollResult reloaded = payrollSettlementService.getMonthlyPayroll(
                new TrainerPayrollSettlementService.MonthlyPayrollQuery(targetMonth, new BigDecimal("70000"))
        );

        assertEquals("CONFIRMED", reloaded.settlementStatus());
        assertEquals(0, unitPrice.compareTo(reloaded.sessionUnitPrice()));
        assertEquals(2, reloaded.rows().size());
    }

    @Test
    @Transactional
    void confirmMonthlySettlementRejectsDuplicateConfirmation() {
        YearMonth targetMonth = YearMonth.of(2026, 3);
        BigDecimal unitPrice = new BigDecimal("50000");
        MemberMembership membership = purchasePtMembership();
        long trainerSchedule = insertSchedule("PT", "Trainer-Confirm-Dupe", targetMonth.atDay(10));
        insertReservation(membership, trainerSchedule, "COMPLETED", targetMonth.atDay(10));

        lifecycleService.confirmMonthlySettlement(
                new TrainerPayrollSettlementService.MonthlyPayrollQuery(targetMonth, unitPrice)
        );

        ApiException exception = assertThrows(ApiException.class, () ->
                lifecycleService.confirmMonthlySettlement(
                        new TrainerPayrollSettlementService.MonthlyPayrollQuery(targetMonth, unitPrice)
                )
        );

        assertEquals(ErrorCode.CONFLICT, exception.getErrorCode());
    }

    private MemberMembership purchasePtMembership() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Member member = memberService.create(new MemberCreateRequest(
                "SAL-LIFE-" + suffix,
                "010-6" + suffix.substring(0, 3) + "-" + suffix.substring(3, 7),
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
                "SAL-LIFE-PT-" + suffix,
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
                    center_id, login_id, password_hash, display_name, user_status,
                    is_deleted, created_at, created_by, updated_at, updated_by
                ) VALUES (
                    1, :loginId, :passwordHash, :displayName, 'ACTIVE',
                    FALSE, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP, 1
                )
                RETURNING user_id
                """)
                .param("loginId", "trainer-life-" + suffix)
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
                    1, 1
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
                    1, 1
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
