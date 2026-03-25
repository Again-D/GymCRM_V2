package com.gymcrm.trainer.entity;

import java.util.List;

public record TrainerDetail(
            Long userId,
            Long centerId,
            String loginId,
            String displayName,
            String userStatus,
            String phone,
            Long assignedMemberCount,
            Long todayConfirmedReservationCount,
            List<AssignedMemberSummary> assignedMembers,
            boolean accountFieldsVisible
    ) {
    }
