package com.gymcrm.trainer.entity;

import java.util.List;

public record TrainerDetail(
            Long userId,
            Long centerId,
            String loginId,
            String userName,
            String userStatus,
            String phone,
            java.math.BigDecimal ptSessionUnitPrice,
            java.math.BigDecimal gxSessionUnitPrice,
            Long assignedMemberCount,
            Long todayConfirmedReservationCount,
            List<AssignedMemberSummary> assignedMembers,
            boolean accountFieldsVisible
    ) {
    }
