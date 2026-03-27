package com.gymcrm.reservation.gx.dto.response;

import com.gymcrm.reservation.entity.TrainerSchedule;

public record GxGeneratedScheduleResponse(
        Long scheduleId,
        Long sourceRuleId,
        Long sourceExceptionId,
        Long trainerUserId,
        String trainerName,
        String className,
        String startAt,
        String endAt,
        Integer capacity,
        Integer currentCount
) {
    public static GxGeneratedScheduleResponse from(TrainerSchedule schedule) {
        return new GxGeneratedScheduleResponse(
                schedule.scheduleId(),
                schedule.sourceRuleId(),
                schedule.sourceExceptionId(),
                schedule.trainerUserId(),
                schedule.trainerName(),
                schedule.slotTitle(),
                schedule.startAt().toString(),
                schedule.endAt().toString(),
                schedule.capacity(),
                schedule.currentCount()
        );
    }
}
