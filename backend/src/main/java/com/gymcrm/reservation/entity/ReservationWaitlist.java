package com.gymcrm.reservation.entity;

import java.time.OffsetDateTime;

public record ReservationWaitlist(
        Long waitingId,
        Long scheduleId,
        Long memberId,
        Long membershipId,
        Integer queueOrder,
        String status,
        OffsetDateTime promotedAt,
        Long reservationId,
        OffsetDateTime createdAt,
        Long createdBy,
        OffsetDateTime updatedAt,
        Long updatedBy
) {
}
