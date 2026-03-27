package com.gymcrm.reservation.gx.dto.response;

import com.gymcrm.reservation.gx.entity.GxScheduleSnapshot;

import java.util.List;

public record GxScheduleSnapshotResponse(
        String month,
        List<GxScheduleRuleResponse> rules,
        List<GxScheduleExceptionResponse> exceptions,
        List<GxGeneratedScheduleResponse> generatedSchedules
) {
    public static GxScheduleSnapshotResponse from(GxScheduleSnapshot snapshot) {
        return new GxScheduleSnapshotResponse(
                snapshot.month().toString(),
                snapshot.rules().stream().map(GxScheduleRuleResponse::from).toList(),
                snapshot.exceptions().stream().map(GxScheduleExceptionResponse::from).toList(),
                snapshot.generatedSchedules().stream().map(GxGeneratedScheduleResponse::from).toList()
        );
    }
}
