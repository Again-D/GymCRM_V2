package com.gymcrm.reservation.gx.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UpsertGxScheduleExceptionRequest(
        @NotBlank(message = "exceptionType is required")
        String exceptionType,
        Long overrideTrainerUserId,
        String overrideStartTime,
        String overrideEndTime,
        Integer overrideCapacity,
        String memo
) {
}
