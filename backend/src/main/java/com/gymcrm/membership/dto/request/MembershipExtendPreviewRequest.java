package com.gymcrm.membership.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record MembershipExtendPreviewRequest(
        @NotNull @Positive Integer extensionDays,
        BigDecimal customAmount
) {
}
