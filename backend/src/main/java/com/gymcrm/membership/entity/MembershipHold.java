package com.gymcrm.membership.entity;

import com.gymcrm.membership.enums.HoldStatus;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record MembershipHold(
        Long membershipHoldId,
        Long centerId,
        Long membershipId,
        HoldStatus holdStatus,
        LocalDate holdStartDate,
        LocalDate holdEndDate,
        OffsetDateTime resumedAt,
        Integer actualHoldDays,
        String reason,
        String memo,
        Boolean overrideLimits,
        OffsetDateTime createdAt,
        Long createdBy,
        OffsetDateTime updatedAt,
        Long updatedBy
) {
}
