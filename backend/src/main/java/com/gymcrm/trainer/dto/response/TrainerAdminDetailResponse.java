package com.gymcrm.trainer.dto.response;

import java.util.List;

import com.gymcrm.trainer.entity.TrainerDetail;

public record TrainerAdminDetailResponse(
            Long userId,
            Long centerId,
            String loginId,
            String displayName,
            String userStatus,
            String phone,
            Long assignedMemberCount,
            Long todayConfirmedReservationCount,
            List<AssignedMemberResponse> assignedMembers
    ) {
        public static TrainerAdminDetailResponse from(TrainerDetail detail) {
            return new TrainerAdminDetailResponse(
                    detail.userId(),
                    detail.centerId(),
                    detail.loginId(),
                    detail.displayName(),
                    detail.userStatus(),
                    detail.phone(),
                    detail.assignedMemberCount(),
                    detail.todayConfirmedReservationCount(),
                    detail.assignedMembers().stream().map(AssignedMemberResponse::from).toList()
            );
        }
    }
