package com.gymcrm.trainer.availability.dto.response;

import com.gymcrm.trainer.availability.entity.TrainerAvailabilitySnapshot;

import java.util.List;

public record TrainerAvailabilitySnapshotResponse(
        Long trainerUserId,
        String month,
        List<TrainerAvailabilityRuleResponse> weeklyRules,
        List<TrainerAvailabilityExceptionResponse> exceptions,
        List<TrainerAvailabilityEffectiveDayResponse> effectiveDays
) {
    public static TrainerAvailabilitySnapshotResponse from(TrainerAvailabilitySnapshot snapshot) {
        return new TrainerAvailabilitySnapshotResponse(
                snapshot.trainerUserId(),
                snapshot.month().toString(),
                snapshot.weeklyRules().stream().map(TrainerAvailabilityRuleResponse::from).toList(),
                snapshot.exceptions().stream().map(TrainerAvailabilityExceptionResponse::from).toList(),
                snapshot.effectiveDays().stream().map(TrainerAvailabilityEffectiveDayResponse::from).toList()
        );
    }
}
