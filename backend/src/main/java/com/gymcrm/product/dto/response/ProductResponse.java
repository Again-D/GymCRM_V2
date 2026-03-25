package com.gymcrm.product.dto.response;

import java.math.BigDecimal;

import com.gymcrm.product.entity.Product;

public record ProductResponse(
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
            String description
    ) {
        public static ProductResponse from(Product product) {
            return new ProductResponse(
                    product.productId(),
                    product.centerId(),
                    product.productName(),
                    product.productCategory(),
                    product.productType(),
                    product.priceAmount(),
                    product.validityDays(),
                    product.totalCount(),
                    product.allowHold(),
                    product.maxHoldDays(),
                    product.maxHoldCount(),
                    product.allowTransfer(),
                    product.productStatus(),
                    product.description()
            );
        }
    }
