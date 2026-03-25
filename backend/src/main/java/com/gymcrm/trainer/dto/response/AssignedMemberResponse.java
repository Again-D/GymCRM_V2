package com.gymcrm.trainer.dto.response;

import com.gymcrm.trainer.entity.AssignedMemberSummary;

public record AssignedMemberResponse(
            Long memberId,
            String memberName,
            Long membershipId,
            String membershipStatus
    ) {
        public static AssignedMemberResponse from(AssignedMemberSummary member) {
            return new AssignedMemberResponse(
                    member.memberId(),
                    member.memberName(),
                    member.membershipId(),
                    member.membershipStatus()
            );
        }
    }
