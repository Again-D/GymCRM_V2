package com.gymcrm.product.dto.request;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Pattern;

public record ProductUpdateRequest(
            String productName,
            @Pattern(regexp = "^(?i)(MEMBERSHIP|PT|GX|ETC)?$", message = "productCategory is invalid")
            String productCategory,
            @Pattern(regexp = "^(?i)(DURATION|COUNT)?$", message = "productType must be DURATION or COUNT")
            String productType,
            @DecimalMin(value = "0", inclusive = true, message = "priceAmount must be >= 0")
            BigDecimal priceAmount,
            Integer validityDays,
            Integer totalCount,
            Boolean allowHold,
            Integer maxHoldDays,
            Integer maxHoldCount,
            Boolean allowTransfer,
            @Pattern(regexp = "^(?i)(ACTIVE|INACTIVE)?$", message = "productStatus must be ACTIVE or INACTIVE")
            String productStatus,
            String description
    ) {}
