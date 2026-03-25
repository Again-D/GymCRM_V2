package com.gymcrm.product.dto.response;

import java.math.BigDecimal;

import com.gymcrm.product.entity.Product;

public record ProductSummaryResponse(
            Long productId,
            Long centerId,
            String productName,
            String productCategory,
            String productType,
            BigDecimal priceAmount,
            String productStatus
    ) {
        public static ProductSummaryResponse from(Product product) {
            return new ProductSummaryResponse(
                    product.productId(),
                    product.centerId(),
                    product.productName(),
                    product.productCategory(),
                    product.productType(),
                    product.priceAmount(),
                    product.productStatus()
            );
        }
    }