package com.gymcrm.product.entity;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ProductPromotion(
        String promotionDiscountType,
        BigDecimal promotionDiscountValue,
        LocalDate promotionStartDate,
        LocalDate promotionEndDate
) {
}
