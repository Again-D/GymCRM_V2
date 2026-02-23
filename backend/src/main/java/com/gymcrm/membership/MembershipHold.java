package com.gymcrm.membership;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record MembershipHold(
        Long membershipHoldId,
        Long centerId,
        Long membershipId,
        String holdStatus,
        LocalDate holdStartDate,
        LocalDate holdEndDate,
        OffsetDateTime resumedAt,
        Integer actualHoldDays,
        String reason,
        String memo,
        OffsetDateTime createdAt,
        Long createdBy,
        OffsetDateTime updatedAt,
        Long updatedBy
) {
}
