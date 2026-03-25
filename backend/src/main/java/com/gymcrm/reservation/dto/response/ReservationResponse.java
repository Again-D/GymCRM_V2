package com.gymcrm.reservation.dto.response;

import java.time.OffsetDateTime;

import com.gymcrm.reservation.entity.Reservation;

public record ReservationResponse(
            Long reservationId,
            Long centerId,
            Long memberId,
            Long membershipId,
            Long scheduleId,
            String reservationStatus,
            OffsetDateTime reservedAt,
            OffsetDateTime cancelledAt,
            OffsetDateTime completedAt,
            OffsetDateTime noShowAt,
            OffsetDateTime checkedInAt,
            String cancelReason,
            String memo
    ) {
        public static ReservationResponse from(Reservation reservation) {
            return new ReservationResponse(
                    reservation.reservationId(),
                    reservation.centerId(),
                    reservation.memberId(),
                    reservation.membershipId(),
                    reservation.scheduleId(),
                    reservation.reservationStatus(),
                    reservation.reservedAt(),
                    reservation.cancelledAt(),
                    reservation.completedAt(),
                    reservation.noShowAt(),
                    reservation.checkedInAt(),
                    reservation.cancelReason(),
                    reservation.memo()
            );
        }
    }
