package com.gymcrm.membership.dto.request;

import jakarta.validation.constraints.Pattern;

import java.time.LocalDate;

public record MembershipRefundConfirmRequest(
        LocalDate refundDate,
        @Pattern(regexp = "^(?i)(CASH|CARD|TRANSFER|ETC)?$", message = "refundPaymentMethod is invalid")
        String refundPaymentMethod,
        String refundReason,
        String refundMemo,
        String paymentMemo
) {
}
