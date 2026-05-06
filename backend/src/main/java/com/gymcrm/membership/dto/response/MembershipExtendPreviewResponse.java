package com.gymcrm.membership.dto.response;

import com.gymcrm.membership.service.MembershipExtendService;

public record MembershipExtendPreviewResponse(
        MembershipExtendCalculationResponse calculation
) {
    public static MembershipExtendPreviewResponse from(MembershipExtendService.ExtendCalculation calculation) {
        return new MembershipExtendPreviewResponse(MembershipExtendCalculationResponse.from(calculation));
    }
}
