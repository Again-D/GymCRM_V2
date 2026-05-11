package com.gymcrm.product.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ProductPromotionRequest(
        String promotionDiscountType,
        BigDecimal promotionDiscountValue,
        LocalDate promotionStartDate,
        LocalDate promotionEndDate
) {
}
