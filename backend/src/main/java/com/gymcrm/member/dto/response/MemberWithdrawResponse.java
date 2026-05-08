package com.gymcrm.member.dto.response;

import java.math.BigDecimal;

public record MemberWithdrawResponse(
        Long memberId,
        boolean withdrawn,
        int refundedMembershipCount,
        int resumedHoldingCount,
        BigDecimal refundAmount
) {
}
