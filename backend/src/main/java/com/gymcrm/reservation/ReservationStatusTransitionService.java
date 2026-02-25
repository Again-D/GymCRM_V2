package com.gymcrm.reservation;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import org.springframework.stereotype.Service;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

@Service
public class ReservationStatusTransitionService {
    private static final Map<ReservationStatus, Set<ReservationStatus>> ALLOWED_TRANSITIONS = buildAllowedTransitions();

    public void assertTransitionAllowed(ReservationStatus currentStatus, ReservationStatus targetStatus) {
        validateInput(currentStatus, targetStatus);
        if (!canTransition(currentStatus, targetStatus)) {
            throw new ApiException(
                    ErrorCode.BUSINESS_RULE,
                    "허용되지 않은 예약 상태 전이입니다. from=%s, to=%s".formatted(currentStatus, targetStatus)
            );
        }
    }

    public ReservationStatus transition(ReservationStatus currentStatus, ReservationStatus targetStatus) {
        assertTransitionAllowed(currentStatus, targetStatus);
        return targetStatus;
    }

    public boolean canTransition(ReservationStatus currentStatus, ReservationStatus targetStatus) {
        validateInput(currentStatus, targetStatus);
        return ALLOWED_TRANSITIONS.getOrDefault(currentStatus, Set.of()).contains(targetStatus);
    }

    private void validateInput(ReservationStatus currentStatus, ReservationStatus targetStatus) {
        if (currentStatus == null || targetStatus == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "예약 상태 전이 값이 누락되었습니다.");
        }
    }

    private static Map<ReservationStatus, Set<ReservationStatus>> buildAllowedTransitions() {
        Map<ReservationStatus, Set<ReservationStatus>> transitions = new EnumMap<>(ReservationStatus.class);
        transitions.put(ReservationStatus.CONFIRMED, EnumSet.of(
                ReservationStatus.CANCELLED,
                ReservationStatus.COMPLETED,
                ReservationStatus.NO_SHOW
        ));
        transitions.put(ReservationStatus.CANCELLED, EnumSet.noneOf(ReservationStatus.class));
        transitions.put(ReservationStatus.COMPLETED, EnumSet.noneOf(ReservationStatus.class));
        transitions.put(ReservationStatus.NO_SHOW, EnumSet.noneOf(ReservationStatus.class));
        return transitions;
    }
}
