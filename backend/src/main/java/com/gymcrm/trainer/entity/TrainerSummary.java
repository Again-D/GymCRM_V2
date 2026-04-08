package com.gymcrm.trainer.entity;

public record TrainerSummary(
            Long userId,
            Long centerId,
            String userName,
            String userStatus,
            String phone,
            Long assignedMemberCount,
            Long todayConfirmedReservationCount
    ) {
    }
