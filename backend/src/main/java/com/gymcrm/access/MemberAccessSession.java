package com.gymcrm.access;

import java.time.OffsetDateTime;

public record MemberAccessSession(
        Long accessSessionId,
        Long centerId,
        Long memberId,
        String memberName,
        String phone,
        Long membershipId,
        Long reservationId,
        Long entryEventId,
        OffsetDateTime entryAt,
        Long exitEventId,
        OffsetDateTime exitedAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
