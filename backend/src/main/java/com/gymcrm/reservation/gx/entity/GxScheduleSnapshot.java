package com.gymcrm.reservation.gx.entity;

import com.gymcrm.reservation.entity.TrainerSchedule;

import java.time.YearMonth;
import java.util.List;

public record GxScheduleSnapshot(
        YearMonth month,
        List<GxScheduleRule> rules,
        List<GxScheduleException> exceptions,
        List<TrainerSchedule> generatedSchedules
) {
}
