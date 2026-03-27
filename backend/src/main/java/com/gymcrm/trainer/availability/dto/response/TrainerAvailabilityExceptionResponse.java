package com.gymcrm.trainer.availability.dto.response;

import com.gymcrm.trainer.availability.entity.TrainerAvailabilityException;

public record TrainerAvailabilityExceptionResponse(
        Long availabilityExceptionId,
        String exceptionDate,
        String exceptionType,
        String overrideStartTime,
        String overrideEndTime,
        String memo
) {
    public static TrainerAvailabilityExceptionResponse from(TrainerAvailabilityException exception) {
        return new TrainerAvailabilityExceptionResponse(
                exception.availabilityExceptionId(),
                exception.exceptionDate().toString(),
                exception.exceptionType(),
                exception.overrideStartTime() == null ? null : exception.overrideStartTime().toString(),
                exception.overrideEndTime() == null ? null : exception.overrideEndTime().toString(),
                exception.memo()
        );
    }
}
