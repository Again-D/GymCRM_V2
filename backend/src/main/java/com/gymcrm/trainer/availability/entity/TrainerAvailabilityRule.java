package com.gymcrm.trainer.availability.entity;

import java.time.LocalTime;
import java.time.OffsetDateTime;

public record TrainerAvailabilityRule(
        Long availabilityRuleId,
        Long centerId,
        Long trainerUserId,
        Integer dayOfWeek,
        LocalTime startTime,
        LocalTime endTime,
        OffsetDateTime createdAt,
        Long createdBy,
        OffsetDateTime updatedAt,
        Long updatedBy
) {
}
