package com.gymcrm.reservation.service;

import com.gymcrm.common.security.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReservationPolicyService {
    public static final String POLICY_SOURCE_BACKEND_DEFAULT = "BACKEND_DEFAULT";
    public static final String PT_DEDUCTION_TIMING_COMPLETION = "COMPLETION";
    public static final String PT_DEDUCTION_TIMING_RESERVATION = "RESERVATION";
    public static final String GX_WAITLIST_MODE_AUTO_PROMOTION = "AUTO_PROMOTION";
    public static final int DEFAULT_CANCELLATION_CUTOFF_MINUTES = 120;
    public static final int DEFAULT_REMINDER_LEAD_MINUTES = 120;

    private final CurrentUserProvider currentUserProvider;

    public ReservationPolicyService(CurrentUserProvider currentUserProvider) {
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional(readOnly = true)
    public ResolvedReservationPolicy getResolvedPolicy() {
        return new ResolvedReservationPolicy(
                currentUserProvider.currentCenterId(),
                POLICY_SOURCE_BACKEND_DEFAULT,
                PT_DEDUCTION_TIMING_COMPLETION,
                GX_WAITLIST_MODE_AUTO_PROMOTION,
                DEFAULT_CANCELLATION_CUTOFF_MINUTES,
                DEFAULT_REMINDER_LEAD_MINUTES
        );
    }

    public record ResolvedReservationPolicy(
            Long centerId,
            String source,
            String ptDeductionTiming,
            String gxWaitlistMode,
            int cancellationCutoffMinutes,
            int reminderLeadMinutes
    ) {
    }
}
