package com.gymcrm.trainer.availability.entity;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;

public record TrainerAvailabilityException(
        Long availabilityExceptionId,
        Long centerId,
        Long trainerUserId,
        LocalDate exceptionDate,
        String exceptionType,
        LocalTime overrideStartTime,
        LocalTime overrideEndTime,
        String memo,
        OffsetDateTime createdAt,
        Long createdBy,
        OffsetDateTime updatedAt,
        Long updatedBy
) {
}
