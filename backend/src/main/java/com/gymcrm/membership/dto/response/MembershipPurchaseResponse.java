package com.gymcrm.membership.dto.response;

import com.gymcrm.membership.service.MembershipPurchaseService;

public record MembershipPurchaseResponse(
        MembershipSummaryResponse membership,
        MembershipPaymentResponse payment,
        MembershipPurchaseCalculationResponse calculation
) {
    public static MembershipPurchaseResponse from(MembershipPurchaseService.PurchaseResult result) {
        return new MembershipPurchaseResponse(
                MembershipSummaryResponse.from(result.membership()),
                MembershipPaymentResponse.from(result.payment()),
                MembershipPurchaseCalculationResponse.from(result.calculation())
        );
    }
}
