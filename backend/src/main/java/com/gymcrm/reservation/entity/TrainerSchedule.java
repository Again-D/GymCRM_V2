package com.gymcrm.reservation.entity;

import java.time.OffsetDateTime;

public record TrainerSchedule(
        Long scheduleId,
        Long centerId,
        Long trainerUserId,
        String scheduleType,
        String trainerName,
        String slotTitle,
        OffsetDateTime startAt,
        OffsetDateTime endAt,
        Integer capacity,
        Integer currentCount,
        String memo,
        OffsetDateTime createdAt,
        Long createdBy,
        OffsetDateTime updatedAt,
        Long updatedBy,
        Long sourceRuleId,
        Long sourceExceptionId
) {
}
