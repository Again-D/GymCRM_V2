package com.gymcrm.reservation.gx.dto.response;

import com.gymcrm.reservation.gx.entity.GxScheduleRule;

public record GxScheduleRuleResponse(
        Long ruleId,
        Long trainerUserId,
        String className,
        Integer dayOfWeek,
        String startTime,
        String endTime,
        Integer capacity,
        String effectiveStartDate,
        Boolean active
) {
    public static GxScheduleRuleResponse from(GxScheduleRule rule) {
        return new GxScheduleRuleResponse(
                rule.ruleId(),
                rule.trainerUserId(),
                rule.className(),
                rule.dayOfWeek(),
                rule.startTime().toString(),
                rule.endTime().toString(),
                rule.capacity(),
                rule.effectiveStartDate().toString(),
                rule.active()
        );
    }
}
