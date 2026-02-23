package com.gymcrm.membership;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.product.Product;
import com.gymcrm.product.ProductService;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

class MembershipHoldServiceTest {

    private final MembershipHoldService service = new MembershipHoldService(
            mock(MemberMembershipRepository.class),
            mock(MembershipHoldRepository.class),
            new MembershipStatusTransitionService(),
            mock(ProductService.class),
            mock(CurrentUserProvider.class)
    );

    @Test
    void rejectsInvertedHoldDateRange() {
        ApiException exception = assertThrows(
                ApiException.class,
                () -> service.validateHoldDateRange(LocalDate.of(2026, 2, 10), LocalDate.of(2026, 2, 9))
        );

        assertEquals(ErrorCode.VALIDATION_ERROR, exception.getErrorCode());
    }

    @Test
    void rejectsHoldWhenProductDisallowsHold() {
        ApiException exception = assertThrows(
                ApiException.class,
                () -> service.validateHoldEligibility(
                        membership("ACTIVE", "DURATION", LocalDate.of(2026, 3, 10), null, 0, 0),
                        product(false, 30, 1),
                        LocalDate.of(2026, 2, 23),
                        LocalDate.of(2026, 2, 25)
                )
        );

        assertEquals(ErrorCode.BUSINESS_RULE, exception.getErrorCode());
    }

    @Test
    void rejectsCountMembershipWithNoRemainingCount() {
        ApiException exception = assertThrows(
                ApiException.class,
                () -> service.validateHoldEligibility(
                        membership("ACTIVE", "COUNT", null, 0, 0, 0),
                        product(true, 30, 3),
                        LocalDate.of(2026, 2, 23),
                        LocalDate.of(2026, 2, 25)
                )
        );

        assertEquals(ErrorCode.BUSINESS_RULE, exception.getErrorCode());
    }

    @Test
    void calculatesActualHoldDaysInclusively() {
        int actualHoldDays = service.calculateActualHoldDays(LocalDate.of(2026, 2, 23), LocalDate.of(2026, 2, 25));

        assertEquals(3, actualHoldDays);
    }

    @Test
    void recalculatesEndDateByActualHoldDays() {
        LocalDate newEndDate = service.recalculateEndDateAfterResume(LocalDate.of(2026, 3, 10), 3);

        assertEquals(LocalDate.of(2026, 3, 13), newEndDate);
    }

    @Test
    void keepsEndDateNullForCountMembershipWithoutValidityWindow() {
        assertNull(service.recalculateEndDateAfterResume(null, 5));
    }

    private MemberMembership membership(
            String status,
            String productType,
            LocalDate endDate,
            Integer remainingCount,
            Integer holdDaysUsed,
            Integer holdCountUsed
    ) {
        OffsetDateTime now = OffsetDateTime.now();
        return new MemberMembership(
                1L,
                1L,
                1L,
                1L,
                status,
                "테스트상품",
                "MEMBERSHIP",
                productType,
                new BigDecimal("100000"),
                now,
                LocalDate.of(2026, 2, 1),
                endDate,
                "COUNT".equals(productType) ? 10 : null,
                remainingCount,
                0,
                holdDaysUsed,
                holdCountUsed,
                null,
                now,
                1L,
                now,
                1L
        );
    }

    private Product product(boolean allowHold, Integer maxHoldDays, Integer maxHoldCount) {
        OffsetDateTime now = OffsetDateTime.now();
        return new Product(
                1L,
                1L,
                "테스트상품",
                "MEMBERSHIP",
                "DURATION",
                new BigDecimal("100000"),
                30,
                null,
                allowHold,
                maxHoldDays,
                maxHoldCount,
                false,
                "ACTIVE",
                null,
                now,
                1L,
                now,
                1L
        );
    }
}
