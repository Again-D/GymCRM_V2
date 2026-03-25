package com.gymcrm.membership.dto.response;

import com.gymcrm.membership.service.MembershipRefundService;

import java.math.BigDecimal;
import java.time.LocalDate;

public record MembershipRefundCalculationResponse(
        LocalDate refundDate,
        BigDecimal originalAmount,
        BigDecimal usedAmount,
        BigDecimal penaltyAmount,
        BigDecimal refundAmount
) {
    public static MembershipRefundCalculationResponse from(MembershipRefundService.RefundCalculation calculation) {
        return new MembershipRefundCalculationResponse(
                calculation.refundDate(),
                calculation.originalAmount(),
                calculation.usedAmount(),
                calculation.penaltyAmount(),
                calculation.refundAmount()
        );
    }
}
