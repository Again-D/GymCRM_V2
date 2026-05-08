package com.gymcrm.member.dto.response;

import com.gymcrm.member.enums.MemberStatus;

import java.math.BigDecimal;

public record MemberWithdrawResponse(
        Long memberId,
        MemberStatus memberStatus,
        boolean withdrawn,
        int refundedMembershipCount,
        int resumedHoldingCount,
        BigDecimal refundAmount
) {
}
