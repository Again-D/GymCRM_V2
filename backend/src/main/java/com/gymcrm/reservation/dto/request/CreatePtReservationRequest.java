package com.gymcrm.reservation.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreatePtReservationRequest(
        @NotNull(message = "memberId is required") Long memberId,
        @NotNull(message = "membershipId is required") Long membershipId,
        @NotNull(message = "trainerUserId is required") Long trainerUserId,
        @NotBlank(message = "startAt is required") String startAt,
        String memo
) {
}
