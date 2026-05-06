package com.gymcrm.membership.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

public record MembershipTransferRequest(
        @NotNull Long transfereeMemberId,
        @PositiveOrZero BigDecimal transferFee,
        String reason,
        String memo
) {
}
