package com.gymcrm.membership.dto.response;

import com.gymcrm.membership.service.MembershipTransferService;

import java.math.BigDecimal;
import java.time.LocalDate;

public record MembershipTransferCalculationResponse(
        String productType,
        Integer originalTotalCount,
        Integer originalRemainingCount,
        Integer newTotalCount,
        Integer newRemainingCount,
        LocalDate newEndDate,
        BigDecimal transferFee
) {
    public static MembershipTransferCalculationResponse from(MembershipTransferService.TransferCalculation calculation) {
        return new MembershipTransferCalculationResponse(
                calculation.productType(),
                calculation.originalTotalCount(),
                calculation.originalRemainingCount(),
                calculation.newTotalCount(),
                calculation.newRemainingCount(),
                calculation.newEndDate(),
                calculation.transferFee()
        );
    }
}
