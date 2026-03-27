package com.gymcrm.reservation.gx.entity;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;

public record GxScheduleRule(
        Long ruleId,
        Long centerId,
        Long trainerUserId,
        String className,
        Integer dayOfWeek,
        LocalTime startTime,
        LocalTime endTime,
        Integer capacity,
        LocalDate effectiveStartDate,
        Boolean active,
        OffsetDateTime createdAt,
        Long createdBy,
        OffsetDateTime updatedAt,
        Long updatedBy
) {
}
