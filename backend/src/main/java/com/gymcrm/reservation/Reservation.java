package com.gymcrm.reservation;

import java.time.OffsetDateTime;

public record Reservation(
        Long reservationId,
        Long centerId,
        Long memberId,
        Long membershipId,
        Long scheduleId,
        String reservationStatus,
        OffsetDateTime reservedAt,
        OffsetDateTime cancelledAt,
        OffsetDateTime completedAt,
        String cancelReason,
        String memo,
        OffsetDateTime createdAt,
        Long createdBy,
        OffsetDateTime updatedAt,
        Long updatedBy
) {
}
