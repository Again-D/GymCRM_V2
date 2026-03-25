package com.gymcrm.reservation.dto.response;

import com.gymcrm.reservation.service.ReservationService;

public record ReservationTargetResponse(
            Long memberId,
            String memberCode,
            String memberName,
            String phone,
            Integer reservableMembershipCount,
            java.time.LocalDate membershipExpiryDate,
            Integer confirmedReservationCount
    ) {
        public static ReservationTargetResponse from(ReservationService.ReservationTarget target) {
            return new ReservationTargetResponse(
                    target.memberId(),
                    target.memberCode(),
                    target.memberName(),
                    target.phone(),
                    target.reservableMembershipCount(),
                    target.membershipExpiryDate(),
                    target.confirmedReservationCount()
            );
        }
    }
