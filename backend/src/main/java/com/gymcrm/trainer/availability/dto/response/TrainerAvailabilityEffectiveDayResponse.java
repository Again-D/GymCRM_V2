package com.gymcrm.trainer.availability.dto.response;

import com.gymcrm.trainer.availability.entity.TrainerAvailabilityEffectiveDay;

public record TrainerAvailabilityEffectiveDayResponse(
        String date,
        String source,
        String availabilityStatus,
        String startTime,
        String endTime,
        String memo
) {
    public static TrainerAvailabilityEffectiveDayResponse from(TrainerAvailabilityEffectiveDay day) {
        return new TrainerAvailabilityEffectiveDayResponse(
                day.date().toString(),
                day.source(),
                day.availabilityStatus(),
                day.startTime() == null ? null : day.startTime().toString(),
                day.endTime() == null ? null : day.endTime().toString(),
                day.memo()
        );
    }
}
