package com.gymcrm.membership.dto.response;

import com.gymcrm.membership.service.MembershipHoldService;

import java.time.LocalDate;

public record MembershipHoldResponse(
        MembershipSummaryResponse membership,
        MembershipHoldSummaryResponse hold,
        HoldPreviewResponse preview
) {
    public static MembershipHoldResponse from(MembershipHoldService.HoldResult result) {
        int plannedHoldDays = (int) (result.hold().holdEndDate().toEpochDay() - result.hold().holdStartDate().toEpochDay() + 1L);
        LocalDate recalculatedEndDate = result.membership().endDate() == null ? null : result.membership().endDate().plusDays(plannedHoldDays);
        return new MembershipHoldResponse(
                MembershipSummaryResponse.from(result.membership()),
                MembershipHoldSummaryResponse.from(result.hold()),
                new HoldPreviewResponse(plannedHoldDays, recalculatedEndDate)
        );
    }

    public record HoldPreviewResponse(
            Integer plannedHoldDays,
            LocalDate recalculatedEndDate
    ) {
    }
}
