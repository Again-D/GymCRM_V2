package com.gymcrm.product.dto.request;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ProductCreateRequest(
            @NotBlank(message = "productName is required")
            String productName,
            @Pattern(regexp = "^(?i)(MEMBERSHIP|PT|GX|ETC)?$", message = "productCategory is invalid")
            String productCategory,
            @NotBlank(message = "productType is required")
            @Pattern(regexp = "^(?i)(DURATION|COUNT)$", message = "productType must be DURATION or COUNT")
            String productType,
            @DecimalMin(value = "0", inclusive = true, message = "priceAmount must be >= 0")
            BigDecimal priceAmount,
            Integer validityDays,
            Integer totalCount,
            Boolean allowHold,
            Integer maxHoldDays,
            Integer maxHoldCount,
            Boolean allowHoldBypass,
            Boolean allowTransfer,
            @Pattern(regexp = "^(?i)(ACTIVE|INACTIVE)?$", message = "productStatus must be ACTIVE or INACTIVE")
            String productStatus,
            String description
    ) {}
