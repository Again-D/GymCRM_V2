package com.gymcrm.reservation.dto.response;

import com.gymcrm.reservation.entity.ReservationWaitlist;

import java.time.OffsetDateTime;

public record ReservationWaitlistResponse(
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
    public static ReservationWaitlistResponse from(ReservationWaitlist waitlist) {
        return new ReservationWaitlistResponse(
                waitlist.waitingId(),
                waitlist.scheduleId(),
                waitlist.memberId(),
                waitlist.membershipId(),
                waitlist.queueOrder(),
                waitlist.status(),
                waitlist.promotedAt(),
                waitlist.reservationId(),
                waitlist.createdAt(),
                waitlist.createdBy(),
                waitlist.updatedAt(),
                waitlist.updatedBy()
        );
    }
}
