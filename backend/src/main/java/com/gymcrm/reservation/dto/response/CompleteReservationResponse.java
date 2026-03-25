package com.gymcrm.reservation.dto.response;

import com.gymcrm.reservation.service.ReservationService;

public record CompleteReservationResponse(
            ReservationResponse reservation,
            Long membershipId,
            String membershipStatus,
            Integer remainingCount,
            Integer usedCount,
            boolean countDeducted
    ) {
        public static CompleteReservationResponse from(ReservationService.CompleteResult result) {
            return new CompleteReservationResponse(
                    ReservationResponse.from(result.reservation()),
                    result.membership().membershipId(),
                    result.membership().membershipStatus(),
                    result.membership().remainingCount(),
                    result.membership().usedCount(),
                    result.countDeducted()
            );
        }
    }

