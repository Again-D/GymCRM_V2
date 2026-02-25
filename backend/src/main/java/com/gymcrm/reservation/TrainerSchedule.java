package com.gymcrm.reservation;

import java.time.OffsetDateTime;

public record TrainerSchedule(
        Long scheduleId,
        Long centerId,
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
        Long updatedBy
) {
}
