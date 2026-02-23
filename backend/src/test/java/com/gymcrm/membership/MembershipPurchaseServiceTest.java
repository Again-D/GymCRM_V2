package com.gymcrm.membership;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.member.Member;
import com.gymcrm.member.MemberService;
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

class MembershipPurchaseServiceTest {

    private final MembershipPurchaseService service = new MembershipPurchaseService(
            mock(MemberService.class),
            mock(ProductService.class),
            mock(MemberMembershipRepository.class),
            mock(PaymentRepository.class),
            mock(CurrentUserProvider.class)
    );

    @Test
    void calculatesDurationPurchaseDates() {
        Product durationProduct = product("DURATION", "ACTIVE", 30, null);
        LocalDate startDate = LocalDate.of(2026, 2, 1);

        MembershipPurchaseService.PurchaseCalculation calculation = service.calculatePurchase(durationProduct, startDate);

        assertEquals(startDate, calculation.startDate());
        assertEquals(LocalDate.of(2026, 3, 2), calculation.endDate());
        assertNull(calculation.totalCount());
        assertNull(calculation.remainingCount());
        assertEquals(new BigDecimal("100000"), calculation.chargeAmount());
    }

    @Test
    void calculatesCountPurchaseRemainingCount() {
        Product countProduct = product("COUNT", "ACTIVE", null, 20);
        LocalDate startDate = LocalDate.of(2026, 2, 1);

        MembershipPurchaseService.PurchaseCalculation calculation = service.calculatePurchase(countProduct, startDate);

        assertEquals(startDate, calculation.startDate());
        assertNull(calculation.endDate());
        assertEquals(20, calculation.totalCount());
        assertEquals(20, calculation.remainingCount());
    }

    @Test
    void rejectsInvalidCountProductShape() {
        Product brokenCountProduct = product("COUNT", "ACTIVE", null, null);

        ApiException exception = assertThrows(ApiException.class, () -> service.calculatePurchase(brokenCountProduct, LocalDate.now()));

        assertEquals(ErrorCode.BUSINESS_RULE, exception.getErrorCode());
    }

    @Test
    void rejectsInactiveProductBeforePurchase() {
        Product inactiveProduct = product("DURATION", "INACTIVE", 30, null);
        Member activeMember = member("ACTIVE");

        ApiException exception = assertThrows(
                ApiException.class,
                () -> service.validatePurchaseEligibility(activeMember, inactiveProduct)
        );

        assertEquals(ErrorCode.BUSINESS_RULE, exception.getErrorCode());
    }

    private Product product(String type, String status, Integer validityDays, Integer totalCount) {
        return new Product(
                1L,
                1L,
                "테스트상품",
                "MEMBERSHIP",
                type,
                new BigDecimal("100000"),
                validityDays,
                totalCount,
                true,
                30,
                1,
                false,
                status,
                null,
                OffsetDateTime.now(),
                1L,
                OffsetDateTime.now(),
                1L
        );
    }

    private Member member(String status) {
        return new Member(
                1L,
                1L,
                "테스트회원",
                "010-0000-0000",
                null,
                null,
                null,
                status,
                LocalDate.now(),
                false,
                false,
                null,
                OffsetDateTime.now(),
                1L,
                OffsetDateTime.now(),
                1L
        );
    }
}
