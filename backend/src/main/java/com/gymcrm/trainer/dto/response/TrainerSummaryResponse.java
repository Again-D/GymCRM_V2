package com.gymcrm.trainer.dto.response;

import com.gymcrm.trainer.entity.TrainerSummary;

public record TrainerSummaryResponse(
            Long userId,
            Long centerId,
            String userName,
            String userStatus,
            String phone,
            Long assignedMemberCount,
            Long todayConfirmedReservationCount
    ) {
        public static TrainerSummaryResponse from(TrainerSummary trainer) {
            return new TrainerSummaryResponse(
                    trainer.userId(),
                    trainer.centerId(),
                    trainer.userName(),
                    trainer.userStatus(),
                    trainer.phone(),
                    trainer.assignedMemberCount(),
                    trainer.todayConfirmedReservationCount()
            );
        }
    }
