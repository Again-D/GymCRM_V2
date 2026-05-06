package com.gymcrm.membership.dto.response;

import com.gymcrm.membership.service.MembershipExtendService;

public record MembershipExtendResponse(
        MembershipExtendCalculationResponse calculation
) {
    public static MembershipExtendResponse from(MembershipExtendService.ExtendResult result) {
        return new MembershipExtendResponse(MembershipExtendCalculationResponse.from(result.calculation()));
    }
}
