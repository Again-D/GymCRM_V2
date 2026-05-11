package com.gymcrm.reservation.dto.response;

import com.gymcrm.reservation.service.ReservationPolicyService.ResolvedReservationPolicy;

public record ReservationPolicyResponse(
        Long centerId,
        String source,
        String ptDeductionTiming,
        String gxWaitlistMode,
        int cancellationCutoffMinutes,
        int reminderLeadMinutes
) {
    public static ReservationPolicyResponse from(ResolvedReservationPolicy policy) {
        return new ReservationPolicyResponse(
                policy.centerId(),
                policy.source(),
                policy.ptDeductionTiming(),
                policy.gxWaitlistMode(),
                policy.cancellationCutoffMinutes(),
                policy.reminderLeadMinutes()
        );
    }
}
