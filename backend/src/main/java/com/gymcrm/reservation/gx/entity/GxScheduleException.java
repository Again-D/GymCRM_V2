package com.gymcrm.reservation.gx.entity;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;

public record GxScheduleException(
        Long exceptionId,
        Long ruleId,
        Long centerId,
        LocalDate exceptionDate,
        String exceptionType,
        Long overrideTrainerUserId,
        LocalTime overrideStartTime,
        LocalTime overrideEndTime,
        Integer overrideCapacity,
        String memo,
        OffsetDateTime createdAt,
        Long createdBy,
        OffsetDateTime updatedAt,
        Long updatedBy
) {
}
