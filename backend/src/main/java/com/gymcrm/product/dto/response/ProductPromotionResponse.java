package com.gymcrm.product.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.gymcrm.product.entity.ProductPromotion;

public record ProductPromotionResponse(
        String promotionDiscountType,
        BigDecimal promotionDiscountValue,
        LocalDate promotionStartDate,
        LocalDate promotionEndDate
) {
    public static ProductPromotionResponse from(ProductPromotion promotion) {
        if (promotion == null) {
            return null;
        }
        return new ProductPromotionResponse(
                promotion.promotionDiscountType(),
                promotion.promotionDiscountValue(),
                promotion.promotionStartDate(),
                promotion.promotionEndDate()
        );
    }
}
