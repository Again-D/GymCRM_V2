package com.gymcrm.membership.dto.request;

import java.time.LocalDate;

public record MembershipHoldRequest(
        LocalDate holdStartDate,
        LocalDate holdEndDate,
        String reason,
        String memo
) {
}
