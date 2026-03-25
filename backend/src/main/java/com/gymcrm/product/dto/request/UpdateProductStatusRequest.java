package com.gymcrm.product.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record UpdateProductStatusRequest(
            @NotBlank(message = "productStatus is required")
            @Pattern(regexp = "^(?i)(ACTIVE|INACTIVE)$", message = "productStatus must be ACTIVE or INACTIVE")
            String productStatus
    ) {}
