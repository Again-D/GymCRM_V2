package com.gymcrm.reservation.dto.request;

import jakarta.validation.constraints.NotNull;

public record CreateReservationRequest(
    @NotNull(message = "memberId is required") Long memberId,
    @NotNull(message = "membershipId is required") Long membershipId,
    @NotNull(message = "scheduleId is required") Long scheduleId,
    String memo
) {}
