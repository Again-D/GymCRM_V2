package com.gymcrm.trainer.entity;

public record AssignedMemberSummary(
            Long memberId,
            String memberName,
            Long membershipId,
            String membershipStatus
    ) {
    }
