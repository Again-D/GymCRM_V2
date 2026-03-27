package com.gymcrm.trainer.availability.dto.response;

import com.gymcrm.trainer.availability.entity.TrainerAvailabilityRule;

public record TrainerAvailabilityRuleResponse(
        Long availabilityRuleId,
        Integer dayOfWeek,
        String startTime,
        String endTime
) {
    public static TrainerAvailabilityRuleResponse from(TrainerAvailabilityRule rule) {
        return new TrainerAvailabilityRuleResponse(
                rule.availabilityRuleId(),
                rule.dayOfWeek(),
                rule.startTime().toString(),
                rule.endTime().toString()
        );
    }
}
