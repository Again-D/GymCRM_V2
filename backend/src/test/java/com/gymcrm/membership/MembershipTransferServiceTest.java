package com.gymcrm.membership;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.member.service.MemberService;
import com.gymcrm.membership.entity.MemberMembership;
import com.gymcrm.membership.enums.MembershipStatus;
import com.gymcrm.membership.repository.MemberMembershipRepository;
import com.gymcrm.membership.repository.MembershipTransferRepository;
import com.gymcrm.membership.service.MembershipStatusTransitionService;
import com.gymcrm.membership.service.MembershipTransferService;
import com.gymcrm.product.entity.Product;
import com.gymcrm.product.service.ProductService;
import com.gymcrm.settlement.repository.PaymentRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

class MembershipTransferServiceTest {

    private final MembershipTransferService service = new MembershipTransferService(
            mock(MemberService.class),
            mock(ProductService.class),
            mock(MemberMembershipRepository.class),
            mock(MembershipTransferRepository.class),
            mock(PaymentRepository.class),
            new MembershipStatusTransitionService(),
            mock(CurrentUserProvider.class)
    );

    @Test
    void calculatesDurationTransferWithRemainingDays() {
        MemberMembership membership = durationMembership(
                LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 5, 31),
                0
        );
        Product product = transferableProduct("DURATION", 151);

        MembershipTransferService.TransferCalculation calculation = service.calculateTransfer(
                membership, product, new BigDecimal("50000")
        );

        assertEquals("DURATION", calculation.productType());
        assertEquals(new BigDecimal("50000.00"), calculation.transferFee());
        assertNotNull(calculation.newEndDate());
    }

    @Test
    void calculatesCountTransferWithRemainingCount() {
        MemberMembership membership = countMembership(10, 6);
        Product product = transferableProduct("COUNT", null);

        MembershipTransferService.TransferCalculation calculation = service.calculateTransfer(
                membership, product, BigDecimal.ZERO
        );

        assertEquals("COUNT", calculation.productType());
        assertEquals(6, calculation.newTotalCount());
        assertEquals(6, calculation.newRemainingCount());
        assertEquals(BigDecimal.ZERO.setScale(2), calculation.transferFee());
    }

    @Test
    void rejectsDurationTransferWithNoRemainingDays() {
        MemberMembership membership = durationMembership(
                LocalDate.of(2025, 1, 1),
                LocalDate.of(2025, 1, 31),
                0
        );
        Product product = transferableProduct("DURATION", 31);

        ApiException exception = assertThrows(
                ApiException.class,
                () -> service.calculateTransfer(membership, product, null)
        );

        assertEquals(ErrorCode.BUSINESS_RULE, exception.getErrorCode());
    }

    @Test
    void rejectsCountTransferWithZeroRemainingCount() {
        MemberMembership membership = countMembership(10, 0);
        Product product = transferableProduct("COUNT", null);

        ApiException exception = assertThrows(
                ApiException.class,
                () -> service.calculateTransfer(membership, product, null)
        );

        assertEquals(ErrorCode.BUSINESS_RULE, exception.getErrorCode());
    }

    @Test
    void rejectsTransferFromNonActiveMembership() {
        ApiException exception = assertThrows(
                ApiException.class,
                () -> service.validateTransferEligibility(durationMembershipWithStatus("REFUNDED"))
        );

        assertEquals(ErrorCode.BUSINESS_RULE, exception.getErrorCode());
    }

    @Test
    void rejectsTransferFromHoldingMembership() {
        ApiException exception = assertThrows(
                ApiException.class,
                () -> service.validateTransferEligibility(durationMembershipWithStatus("HOLDING"))
        );

        assertEquals(ErrorCode.BUSINESS_RULE, exception.getErrorCode());
    }

    private MemberMembership durationMembership(LocalDate startDate, LocalDate endDate, int holdDaysUsed) {
        OffsetDateTime now = OffsetDateTime.now();
        return new MemberMembership(
                1L, 1L, 1L, 1L, null, MembershipStatus.ACTIVE.name(),
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

    private MemberMembership countMembership(int totalCount, int remainingCount) {
        OffsetDateTime now = OffsetDateTime.now();
        return new MemberMembership(
                1L, 1L, 1L, 1L, null, MembershipStatus.ACTIVE.name(),
                "PT 10회", "PT", "COUNT",
                new BigDecimal("500000"),
                now,
                LocalDate.of(2026, 1, 1),
                null,
                totalCount,
                remainingCount,
                0,
                0,
                0,
                null,
                now, 1L, now, 1L
        );
    }

    private MemberMembership durationMembershipWithStatus(String status) {
        OffsetDateTime now = OffsetDateTime.now();
        return new MemberMembership(
                1L, 1L, 1L, 1L, null, status,
                "기간제", "MEMBERSHIP", "DURATION",
                new BigDecimal("100000"),
                now,
                LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 5, 31),
                null,
                null,
                0,
                0,
                0,
                null,
                now, 1L, now, 1L
        );
    }

    private Product transferableProduct(String productType, Integer validityDays) {
        OffsetDateTime now = OffsetDateTime.now();
        return new Product(
                1L, 1L, "Test Product", "MEMBERSHIP", productType,
                new BigDecimal("100000"),
                validityDays,
                10,
                true, 30, 1, false, true, null, null, "ACTIVE",
                "Test product",
                now, 1L, now, 1L
        );
    }
}
