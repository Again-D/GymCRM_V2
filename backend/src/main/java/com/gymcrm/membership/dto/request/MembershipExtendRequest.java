package com.gymcrm.membership.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record MembershipExtendRequest(
        @NotNull @Positive Integer extensionDays,
        BigDecimal customAmount,
        String reason,
        String memo
) {
}
