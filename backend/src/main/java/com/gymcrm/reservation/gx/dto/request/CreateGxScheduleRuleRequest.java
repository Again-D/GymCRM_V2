package com.gymcrm.reservation.gx.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateGxScheduleRuleRequest(
        @NotBlank(message = "className is required")
        String className,
        @NotNull(message = "trainerUserId is required")
        Long trainerUserId,
        @NotNull(message = "dayOfWeek is required")
        Integer dayOfWeek,
        @NotBlank(message = "startTime is required")
        String startTime,
        @NotBlank(message = "endTime is required")
        String endTime,
        @NotNull(message = "capacity is required")
        Integer capacity,
        @NotBlank(message = "effectiveStartDate is required")
        String effectiveStartDate
) {
}
