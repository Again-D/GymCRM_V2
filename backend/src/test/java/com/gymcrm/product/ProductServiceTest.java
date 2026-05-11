package com.gymcrm.product;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.auth.repository.AuthUserRepository;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.product.repository.ProductRepository;
import com.gymcrm.product.service.ProductService;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

class ProductServiceTest {

    private final ProductService service = new ProductService(
            mock(ProductRepository.class),
            mock(AuthUserRepository.class),
            mock(CurrentUserProvider.class)
    );

    @Test
    void rejectsDurationProductWithoutValidityDays() {
        ApiException exception = assertThrows(ApiException.class, () -> service.create(
                new ProductService.ProductCreateRequest(
                        "기간제상품",
                        "MEMBERSHIP",
                        "DURATION",
                        new BigDecimal("120000"),
                        null,
                        null,
                        true,
                        30,
                        1,
                        false,
                        false,
                        null,
                        null,
                        "ACTIVE",
                        null
                )
        ));

        assertEquals(ErrorCode.VALIDATION_ERROR, exception.getErrorCode());
        assertEquals("validityDays must be > 0 for DURATION product", exception.getMessage());
    }

    @Test
    void rejectsCountProductWithoutTotalCount() {
        ApiException exception = assertThrows(ApiException.class, () -> service.create(
                new ProductService.ProductCreateRequest(
                        "횟수제상품",
                        "PT",
                        "COUNT",
                        new BigDecimal("50000"),
                        null,
                        null,
                        false,
                        null,
                        null,
                        false,
                        false,
                        41L,
                        null,
                        "ACTIVE",
                        null
                )
        ));

        assertEquals(ErrorCode.VALIDATION_ERROR, exception.getErrorCode());
        assertEquals("totalCount must be > 0 for COUNT product", exception.getMessage());
    }

    @Test
    void rejectsNegativeHoldPolicyValuesWhenHoldAllowed() {
        ApiException exception = assertThrows(ApiException.class, () -> service.create(
                new ProductService.ProductCreateRequest(
                        "홀딩상품",
                        "MEMBERSHIP",
                        "DURATION",
                        new BigDecimal("90000"),
                        30,
                        null,
                        true,
                        -1,
                        1,
                        false,
                        false,
                        null,
                        null,
                        "ACTIVE",
                        null
                )
        ));

        assertEquals(ErrorCode.VALIDATION_ERROR, exception.getErrorCode());
        assertEquals("maxHoldDays must be >= 0", exception.getMessage());
    }

    @Test
    void rejectsPtProductWithoutAssignedTrainer() {
        ApiException exception = assertThrows(ApiException.class, () -> service.create(
                new ProductService.ProductCreateRequest(
                        "PT 상품",
                        "PT",
                        "COUNT",
                        new BigDecimal("50000"),
                        null,
                        10,
                        false,
                        null,
                        null,
                        false,
                        false,
                        null,
                        null,
                        "ACTIVE",
                        null
                )
        ));

        assertEquals(ErrorCode.VALIDATION_ERROR, exception.getErrorCode());
        assertEquals("PT product requires assignedTrainerId", exception.getMessage());
    }

    @Test
    void rejectsNonPtProductWithAssignedTrainer() {
        ApiException exception = assertThrows(ApiException.class, () -> service.create(
                new ProductService.ProductCreateRequest(
                        "회원권",
                        "MEMBERSHIP",
                        "DURATION",
                        new BigDecimal("100000"),
                        30,
                        null,
                        true,
                        30,
                        1,
                        false,
                        false,
                        41L,
                        null,
                        "ACTIVE",
                        null
                )
        ));

        assertEquals(ErrorCode.VALIDATION_ERROR, exception.getErrorCode());
        assertEquals("assignedTrainerId is only allowed for PT products", exception.getMessage());
    }

    @Test
    void rejectsPartialPromotionPayloads() {
        ApiException exception = assertThrows(ApiException.class, () -> service.create(
                new ProductService.ProductCreateRequest(
                        "프로모션상품",
                        "MEMBERSHIP",
                        "DURATION",
                        new BigDecimal("100000"),
                        30,
                        null,
                        true,
                        30,
                        1,
                        false,
                        false,
                        null,
                        new com.gymcrm.product.dto.request.ProductPromotionRequest(
                                "PERCENT",
                                null,
                                java.time.LocalDate.parse("2026-05-01"),
                                java.time.LocalDate.parse("2026-05-31")
                        ),
                        "ACTIVE",
                        null
                )
        ));

        assertEquals(ErrorCode.VALIDATION_ERROR, exception.getErrorCode());
        assertEquals("promotion fields must be provided together", exception.getMessage());
    }

    @Test
    void rejectsPercentPromotionAboveHundred() {
        ApiException exception = assertThrows(ApiException.class, () -> service.create(
                new ProductService.ProductCreateRequest(
                        "프로모션상품",
                        "MEMBERSHIP",
                        "DURATION",
                        new BigDecimal("100000"),
                        30,
                        null,
                        true,
                        30,
                        1,
                        false,
                        false,
                        null,
                        new com.gymcrm.product.dto.request.ProductPromotionRequest(
                                "PERCENT",
                                new BigDecimal("120"),
                                java.time.LocalDate.parse("2026-05-01"),
                                java.time.LocalDate.parse("2026-05-31")
                        ),
                        "ACTIVE",
                        null
                )
        ));

        assertEquals(ErrorCode.VALIDATION_ERROR, exception.getErrorCode());
        assertEquals("promotionDiscountValue must be <= 100 for PERCENT", exception.getMessage());
    }
}
