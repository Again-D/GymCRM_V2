package com.gymcrm.membership.dto.response;

import com.gymcrm.membership.service.MembershipRefundService;

public record MembershipRefundPreviewResponse(
        MembershipRefundCalculationResponse calculation
) {
    public static MembershipRefundPreviewResponse from(MembershipRefundService.RefundCalculation calculation) {
        return new MembershipRefundPreviewResponse(MembershipRefundCalculationResponse.from(calculation));
    }
}
