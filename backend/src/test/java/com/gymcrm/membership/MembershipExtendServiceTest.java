package com.gymcrm.membership;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.membership.entity.MemberMembership;
import com.gymcrm.membership.enums.MembershipStatus;
import com.gymcrm.membership.repository.MemberMembershipRepository;
import com.gymcrm.membership.repository.MembershipExtensionRepository;
import com.gymcrm.membership.service.MembershipExtendService;
import com.gymcrm.membership.service.MembershipStatusTransitionService;
import com.gymcrm.product.entity.Product;
import com.gymcrm.product.service.ProductService;
import com.gymcrm.settlement.repository.PaymentRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

class MembershipExtendServiceTest {

    private final MembershipExtendService service = new MembershipExtendService(
            mock(ProductService.class),
            mock(MemberMembershipRepository.class),
            mock(MembershipExtensionRepository.class),
            mock(PaymentRepository.class),
            new MembershipStatusTransitionService(),
            mock(CurrentUserProvider.class)
    );

    @Test
    void calculatesExtensionForDurationMembership() {
        MemberMembership membership = durationMembershipWithStatus(MembershipStatus.ACTIVE.name());
        Product product = durationProduct(30);

        MembershipExtendService.ExtendCalculation calculation = service.calculateExtension(
                membership,
                product,
                10,
                null
        );

        assertEquals(LocalDate.of(2026, 6, 30), calculation.originalEndDate());
        assertEquals(LocalDate.of(2026, 7, 10), calculation.newEndDate());
        assertEquals(10, calculation.extensionDays());
        assertEquals(new BigDecimal("33333.33"), calculation.calculatedFee());
        assertEquals(new BigDecimal("33333.33"), calculation.actualFee());
    }

    @Test
    void usesCustomAmountWhenProvided() {
        MemberMembership membership = durationMembershipWithStatus(MembershipStatus.ACTIVE.name());
        Product product = durationProduct(30);

        MembershipExtendService.ExtendCalculation calculation = service.calculateExtension(
                membership,
                product,
                10,
                new BigDecimal("15000")
        );

        assertEquals(new BigDecimal("33333.33"), calculation.calculatedFee());
        assertEquals(new BigDecimal("15000.00"), calculation.actualFee());
    }

    @Test
    void rejectsWhenExtensionDaysIsZero() {
        MemberMembership membership = durationMembershipWithStatus(MembershipStatus.ACTIVE.name());
        Product product = durationProduct(30);

        ApiException exception = assertThrows(
                ApiException.class,
                () -> service.calculateExtension(membership, product, 0, null)
        );

        assertEquals(ErrorCode.VALIDATION_ERROR, exception.getErrorCode());
    }

    @Test
    void rejectsCountProductExtension() {
        MemberMembership membership = durationMembershipWithStatus(MembershipStatus.ACTIVE.name());
        Product product = countProduct();

        ApiException exception = assertThrows(
                ApiException.class,
                () -> service.calculateExtension(membership, product, 5, null)
        );

        assertEquals(ErrorCode.BUSINESS_RULE, exception.getErrorCode());
    }

    @Test
    void rejectsHoldingMembershipExtension() {
        MemberMembership membership = durationMembershipWithStatus(MembershipStatus.HOLDING.name());

        ApiException exception = assertThrows(
                ApiException.class,
                () -> service.validateExtendEligibility(membership, 5)
        );

        assertEquals(ErrorCode.BUSINESS_RULE, exception.getErrorCode());
    }

    private MemberMembership durationMembershipWithStatus(String status) {
        OffsetDateTime now = OffsetDateTime.now();
        return new MemberMembership(
                1L, 1L, 1L, 1L, null, status,
                "기간제", "MEMBERSHIP", "DURATION",
                new BigDecimal("100000"),
                now,
                LocalDate.of(2026, 6, 1),
                LocalDate.of(2026, 6, 30),
                null,
                null,
                0,
                0,
                0,
                null,
                now, 1L, now, 1L
        );
    }

    private Product durationProduct(Integer validityDays) {
        OffsetDateTime now = OffsetDateTime.now();
        return new Product(
                1L, 1L, "기간제 회원권", "MEMBERSHIP", "DURATION",
                new BigDecimal("100000"),
                validityDays,
                null,
                true, 30, 1, false, true, "ACTIVE",
                "기간제",
                now, 1L, now, 1L
        );
    }

    private Product countProduct() {
        OffsetDateTime now = OffsetDateTime.now();
        return new Product(
                1L, 1L, "PT", "PT", "COUNT",
                new BigDecimal("500000"),
                null,
                10,
                true, 30, 1, false, true, "ACTIVE",
                "횟수제",
                now, 1L, now, 1L
        );
    }
}
