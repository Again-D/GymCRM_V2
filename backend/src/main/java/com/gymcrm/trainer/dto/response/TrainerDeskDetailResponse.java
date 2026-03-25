package com.gymcrm.trainer.dto.response;

import java.util.List;

import com.gymcrm.trainer.entity.TrainerDetail;

public record TrainerDeskDetailResponse(
            Long userId,
            Long centerId,
            String displayName,
            String userStatus,
            String phone,
            Long assignedMemberCount,
            Long todayConfirmedReservationCount,
            List<AssignedMemberResponse> assignedMembers
    ) {
        public static TrainerDeskDetailResponse from(TrainerDetail detail) {
            return new TrainerDeskDetailResponse(
                    detail.userId(),
                    detail.centerId(),
                    detail.displayName(),
                    detail.userStatus(),
                    detail.phone(),
                    detail.assignedMemberCount(),
                    detail.todayConfirmedReservationCount(),
                    detail.assignedMembers().stream().map(AssignedMemberResponse::from).toList()
            );
        }
    }
