package com.gymcrm.membership.dto.response;

import com.gymcrm.membership.service.MembershipTransferService;

public record MembershipTransferPreviewResponse(
        MembershipTransferCalculationResponse calculation
) {
    public static MembershipTransferPreviewResponse from(MembershipTransferService.TransferCalculation calculation) {
        return new MembershipTransferPreviewResponse(MembershipTransferCalculationResponse.from(calculation));
    }
}
