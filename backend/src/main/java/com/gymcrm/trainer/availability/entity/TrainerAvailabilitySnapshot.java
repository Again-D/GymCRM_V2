package com.gymcrm.trainer.availability.entity;

import java.time.YearMonth;
import java.util.List;

public record TrainerAvailabilitySnapshot(
        Long trainerUserId,
        YearMonth month,
        List<TrainerAvailabilityRule> weeklyRules,
        List<TrainerAvailabilityException> exceptions,
        List<TrainerAvailabilityEffectiveDay> effectiveDays
) {
}
