package com.gymcrm.membership.dto.response;

import com.gymcrm.membership.service.MembershipPurchaseService;

import java.math.BigDecimal;
import java.time.LocalDate;

public record MembershipPurchaseCalculationResponse(
        LocalDate startDate,
        LocalDate endDate,
        Integer totalCount,
        Integer remainingCount,
        BigDecimal chargeAmount
) {
    public static MembershipPurchaseCalculationResponse from(MembershipPurchaseService.PurchaseCalculation calculation) {
        return new MembershipPurchaseCalculationResponse(
                calculation.startDate(),
                calculation.endDate(),
                calculation.totalCount(),
                calculation.remainingCount(),
                calculation.chargeAmount()
        );
    }
}
