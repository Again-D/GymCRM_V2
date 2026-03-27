package com.gymcrm.trainer.availability.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UpsertTrainerAvailabilityExceptionRequest(
        @NotBlank(message = "exceptionType is required")
        String exceptionType,
        String overrideStartTime,
        String overrideEndTime,
        String memo
) {
}
