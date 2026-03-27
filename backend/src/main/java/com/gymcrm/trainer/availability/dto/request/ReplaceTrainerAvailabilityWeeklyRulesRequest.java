package com.gymcrm.trainer.availability.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ReplaceTrainerAvailabilityWeeklyRulesRequest(
        @NotNull(message = "rules is required")
        List<@Valid WeeklyRuleItem> rules
) {
    public record WeeklyRuleItem(
            @NotNull(message = "dayOfWeek is required")
            Integer dayOfWeek,
            @NotNull(message = "startTime is required")
            String startTime,
            @NotNull(message = "endTime is required")
            String endTime
    ) {
    }
}
