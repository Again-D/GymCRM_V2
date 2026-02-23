package com.gymcrm.product;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record Product(
        Long productId,
        Long centerId,
        String productName,
        String productCategory,
        String productType,
        BigDecimal priceAmount,
        Integer validityDays,
        Integer totalCount,
        boolean allowHold,
        Integer maxHoldDays,
        Integer maxHoldCount,
        boolean allowTransfer,
        String productStatus,
        String description,
        OffsetDateTime createdAt,
        Long createdBy,
        OffsetDateTime updatedAt,
        Long updatedBy
) {
}
