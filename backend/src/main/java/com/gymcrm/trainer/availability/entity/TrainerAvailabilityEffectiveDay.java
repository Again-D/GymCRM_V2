package com.gymcrm.trainer.availability.entity;

import java.time.LocalDate;
import java.time.LocalTime;

public record TrainerAvailabilityEffectiveDay(
        LocalDate date,
        String source,
        String availabilityStatus,
        LocalTime startTime,
        LocalTime endTime,
        String memo
) {
}
