package com.gymcrm.membership.dto.response;

import com.gymcrm.membership.service.MembershipExtendService;

import java.math.BigDecimal;
import java.time.LocalDate;

public record MembershipExtendCalculationResponse(
        LocalDate originalEndDate,
        LocalDate newEndDate,
        Integer extensionDays,
        BigDecimal calculatedFee,
        BigDecimal actualFee
) {
    public static MembershipExtendCalculationResponse from(MembershipExtendService.ExtendCalculation calculation) {
        return new MembershipExtendCalculationResponse(
                calculation.originalEndDate(),
                calculation.newEndDate(),
                calculation.extensionDays(),
                calculation.calculatedFee(),
                calculation.actualFee()
        );
    }
}
