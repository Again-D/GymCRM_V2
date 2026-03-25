package com.gymcrm.membership.dto.response;

import com.gymcrm.membership.service.MembershipHoldService;

import java.time.LocalDate;

public record MembershipResumeResponse(
        MembershipSummaryResponse membership,
        MembershipHoldSummaryResponse hold,
        ResumeCalculationResponse calculation
) {
    public static MembershipResumeResponse from(MembershipHoldService.ResumeResult result) {
        return new MembershipResumeResponse(
                MembershipSummaryResponse.from(result.membership()),
                MembershipHoldSummaryResponse.from(result.hold()),
                new ResumeCalculationResponse(result.actualHoldDays(), result.recalculatedEndDate())
        );
    }

    public record ResumeCalculationResponse(
            Integer actualHoldDays,
            LocalDate recalculatedEndDate
    ) {
    }
}
