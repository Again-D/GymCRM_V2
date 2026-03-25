package com.gymcrm.trainer.entity;

public record TrainerSummary(
            Long userId,
            Long centerId,
            String displayName,
            String userStatus,
            String phone,
            Long assignedMemberCount,
            Long todayConfirmedReservationCount
    ) {
    }
