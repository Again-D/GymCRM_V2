package com.gymcrm.membership.dto.response;

import com.gymcrm.membership.service.MembershipTransferService;

public record MembershipTransferResponse(
        MembershipTransferCalculationResponse calculation
) {
    public static MembershipTransferResponse from(MembershipTransferService.TransferResult result) {
        return new MembershipTransferResponse(MembershipTransferCalculationResponse.from(result.calculation()));
    }
}
