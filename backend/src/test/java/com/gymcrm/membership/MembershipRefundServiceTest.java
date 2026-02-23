package com.gymcrm.membership;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

class MembershipRefundServiceTest {

    private final MembershipRefundService service = new MembershipRefundService(
            mock(MemberMembershipRepository.class),
            mock(MembershipRefundRepository.class),
            mock(PaymentRepository.class),
            new MembershipStatusTransitionService(),
            mock(CurrentUserProvider.class)
    );

    @Test
    void calculatesDurationRefundWithProratedUsedAmountAndPenalty() {
        MemberMembership membership = durationMembership(
                LocalDate.of(2026, 2, 1),
                LocalDate.of(2026, 3, 2),
                0
        ); // total 30 days

        MembershipRefundService.RefundCalculation calculation = service.calculateRefund(
                membership,
                new BigDecimal("100000"),
                LocalDate.of(2026, 2, 10)
        ); // used 10 days

        assertEquals(new BigDecimal("100000.00"), calculation.originalAmount());
        assertEquals(new BigDecimal("33333.33"), calculation.usedAmount());
        assertEquals(new BigDecimal("10000.00"), calculation.penaltyAmount());
        assertEquals(new BigDecimal("56666.67"), calculation.refundAmount());
    }

    @Test
    void calculatesCountRefundUsingUsedCountRatio() {
        MemberMembership membership = countMembership(20, 14, 6);

        MembershipRefundService.RefundCalculation calculation = service.calculateRefund(
                membership,
                new BigDecimal("200000"),
                LocalDate.of(2026, 2, 23)
        );

        assertEquals(new BigDecimal("60000.00"), calculation.usedAmount());
        assertEquals(new BigDecimal("20000.00"), calculation.penaltyAmount());
        assertEquals(new BigDecimal("120000.00"), calculation.refundAmount());
    }

    @Test
    void refundAmountIsClampedAtZero() {
        MemberMembership membership = countMembership(10, 0, 10); // fully used

        MembershipRefundService.RefundCalculation calculation = service.calculateRefund(
                membership,
                new BigDecimal("100000"),
                LocalDate.of(2026, 2, 23)
        );

        assertEquals(new BigDecimal("100000.00"), calculation.usedAmount());
        assertEquals(new BigDecimal("10000.00"), calculation.penaltyAmount());
        assertEquals(new BigDecimal("0.00"), calculation.refundAmount());
    }

    @Test
    void rejectsRefundFromAlreadyRefundedMembership() {
        ApiException exception = assertThrows(
                ApiException.class,
                () -> service.validateRefundEligibility(durationMembershipWithStatus("REFUNDED"))
        );

        assertEquals(ErrorCode.BUSINESS_RULE, exception.getErrorCode());
    }

    @Test
    void rejectsRefundWhileHolding() {
        ApiException exception = assertThrows(
                ApiException.class,
                () -> service.validateRefundEligibility(durationMembershipWithStatus("HOLDING"))
        );

        assertEquals(ErrorCode.BUSINESS_RULE, exception.getErrorCode());
        assertEquals("홀딩/종료/환불 상태 회원권은 환불할 수 없습니다. 홀딩 상태는 먼저 해제 후 환불해주세요.", exception.getMessage());
    }

    private MemberMembership durationMembership(LocalDate startDate, LocalDate endDate, int holdDaysUsed) {
        OffsetDateTime now = OffsetDateTime.now();
        return new MemberMembership(
                1L, 1L, 1L, 1L, "ACTIVE",
                "기간제", "MEMBERSHIP", "DURATION",
                new BigDecimal("100000"),
                now,
                startDate,
                endDate,
                null,
                null,
                0,
                holdDaysUsed,
                0,
                null,
                now, 1L, now, 1L
        );
    }

    private MemberMembership countMembership(int totalCount, int remainingCount, int usedCount) {
        OffsetDateTime now = OffsetDateTime.now();
        return new MemberMembership(
                1L, 1L, 1L, 1L, "ACTIVE",
                "횟수제", "PT", "COUNT",
                new BigDecimal("200000"),
                now,
                LocalDate.of(2026, 2, 1),
                null,
                totalCount,
                remainingCount,
                usedCount,
                0,
                0,
                null,
                now, 1L, now, 1L
        );
    }

    private MemberMembership durationMembershipWithStatus(String status) {
        OffsetDateTime now = OffsetDateTime.now();
        return new MemberMembership(
                1L, 1L, 1L, 1L, status,
                "기간제", "MEMBERSHIP", "DURATION",
                new BigDecimal("100000"),
                now,
                LocalDate.of(2026, 2, 1),
                LocalDate.of(2026, 3, 2),
                null,
                null,
                0,
                0,
                0,
                null,
                now, 1L, now, 1L
        );
    }
}
