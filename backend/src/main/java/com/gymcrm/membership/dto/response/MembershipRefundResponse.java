package com.gymcrm.membership.dto.response;

import com.gymcrm.membership.service.MembershipRefundService;

public record MembershipRefundResponse(
        MembershipSummaryResponse membership,
        MembershipPaymentResponse payment,
        MembershipRefundSummaryResponse refund,
        MembershipRefundCalculationResponse calculation
) {
    public static MembershipRefundResponse from(MembershipRefundService.RefundResult result) {
        return new MembershipRefundResponse(
                MembershipSummaryResponse.from(result.membership()),
                MembershipPaymentResponse.from(result.refundPayment()),
                MembershipRefundSummaryResponse.from(result.refund()),
                MembershipRefundCalculationResponse.from(result.calculation())
        );
    }
}
