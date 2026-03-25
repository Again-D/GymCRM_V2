package com.gymcrm.membership.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;
import java.time.LocalDate;

public record MembershipPurchaseRequest(
        @NotNull(message = "productId is required")
        Long productId,
        Long assignedTrainerId,
        LocalDate startDate,
        @DecimalMin(value = "0", inclusive = true, message = "paidAmount must be >= 0")
        BigDecimal paidAmount,
        @Pattern(regexp = "^(?i)(CASH|CARD|TRANSFER|ETC)?$", message = "paymentMethod is invalid")
        String paymentMethod,
        String membershipMemo,
        String paymentMemo
) {
}
