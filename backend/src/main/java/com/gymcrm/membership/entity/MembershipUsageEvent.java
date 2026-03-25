package com.gymcrm.membership.entity;

import java.time.OffsetDateTime;

public record MembershipUsageEvent(
        Long usageEventId,
        Long centerId,
        Long membershipId,
        Long reservationId,
        String usageEventType,
        Integer deltaCount,
        OffsetDateTime processedAt,
        Long processedBy,
        String memo,
        OffsetDateTime createdAt
) {
}
