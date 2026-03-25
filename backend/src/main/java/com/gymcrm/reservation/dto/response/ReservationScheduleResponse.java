package com.gymcrm.reservation.dto.response;

import java.time.OffsetDateTime;

import com.gymcrm.reservation.entity.TrainerSchedule;

public record ReservationScheduleResponse(
            Long scheduleId,
            Long centerId,
            String scheduleType,
            String trainerName,
            String slotTitle,
            OffsetDateTime startAt,
            OffsetDateTime endAt,
            Integer capacity,
            Integer currentCount,
            String memo
    ) {
        public static ReservationScheduleResponse from(TrainerSchedule schedule) {
            return new ReservationScheduleResponse(
                    schedule.scheduleId(),
                    schedule.centerId(),
                    schedule.scheduleType(),
                    schedule.trainerName(),
                    schedule.slotTitle(),
                    schedule.startAt(),
                    schedule.endAt(),
                    schedule.capacity(),
                    schedule.currentCount(),
                    schedule.memo()
            );
        }
    }
