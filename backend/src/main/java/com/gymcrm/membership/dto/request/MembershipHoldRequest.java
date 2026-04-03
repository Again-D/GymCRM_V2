package com.gymcrm.membership.dto.request;

import java.time.LocalDate;

public record MembershipHoldRequest(
        Long membershipId,
        LocalDate holdStartDate,
        LocalDate holdEndDate,
        String reason,
        String memo,
        Boolean overrideLimits
) {
}
