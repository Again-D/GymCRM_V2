package com.gymcrm.reservation.gx.dto.response;

import com.gymcrm.reservation.gx.entity.GxScheduleException;

public record GxScheduleExceptionResponse(
        Long exceptionId,
        Long ruleId,
        String exceptionDate,
        String exceptionType,
        Long overrideTrainerUserId,
        String overrideStartTime,
        String overrideEndTime,
        Integer overrideCapacity,
        String memo
) {
    public static GxScheduleExceptionResponse from(GxScheduleException exception) {
        return new GxScheduleExceptionResponse(
                exception.exceptionId(),
                exception.ruleId(),
                exception.exceptionDate().toString(),
                exception.exceptionType(),
                exception.overrideTrainerUserId(),
                exception.overrideStartTime() == null ? null : exception.overrideStartTime().toString(),
                exception.overrideEndTime() == null ? null : exception.overrideEndTime().toString(),
                exception.overrideCapacity(),
                exception.memo()
        );
    }
}
