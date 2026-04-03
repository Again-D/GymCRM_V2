package com.gymcrm.membership.dto.response;

import com.gymcrm.membership.entity.MembershipHold;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record MembershipHoldSummaryResponse(
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
        Boolean overrideLimits
) {
    public static MembershipHoldSummaryResponse from(MembershipHold hold) {
        return new MembershipHoldSummaryResponse(
                hold.membershipHoldId(),
                hold.centerId(),
                hold.membershipId(),
                hold.holdStatus().name(),
                hold.holdStartDate(),
                hold.holdEndDate(),
                hold.resumedAt(),
                hold.actualHoldDays(),
                hold.reason(),
                hold.memo(),
                hold.overrideLimits()
        );
    }
}
