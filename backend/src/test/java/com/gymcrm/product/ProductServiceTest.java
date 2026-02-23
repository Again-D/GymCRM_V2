package com.gymcrm.product;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

class ProductServiceTest {

    private final ProductService service = new ProductService(
            mock(ProductRepository.class),
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
                        "ACTIVE",
                        null
                )
        ));

        assertEquals(ErrorCode.VALIDATION_ERROR, exception.getErrorCode());
        assertEquals("maxHoldDays must be >= 0", exception.getMessage());
    }
}
