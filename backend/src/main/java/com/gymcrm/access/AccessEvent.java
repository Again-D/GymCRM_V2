package com.gymcrm.access;

import java.time.OffsetDateTime;

public record AccessEvent(
        Long accessEventId,
        Long centerId,
        Long memberId,
        Long membershipId,
        Long reservationId,
        Long processedBy,
        String eventType,
        String denyReason,
        OffsetDateTime processedAt,
        OffsetDateTime createdAt
) {
}
