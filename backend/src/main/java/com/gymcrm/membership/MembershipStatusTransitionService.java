package com.gymcrm.membership;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import org.springframework.stereotype.Service;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

@Service
public class MembershipStatusTransitionService {
    private static final Map<MembershipStatus, Set<MembershipStatus>> ALLOWED_TRANSITIONS = buildAllowedTransitions();

    public void assertTransitionAllowed(MembershipStatus currentStatus, MembershipStatus targetStatus) {
        validateInput(currentStatus, targetStatus);
        if (!canTransition(currentStatus, targetStatus)) {
            throw new ApiException(
                    ErrorCode.BUSINESS_RULE,
                    "허용되지 않은 회원권 상태 전이입니다. from=%s, to=%s".formatted(currentStatus, targetStatus)
            );
        }
    }

    public MembershipStatus transition(MembershipStatus currentStatus, MembershipStatus targetStatus) {
        assertTransitionAllowed(currentStatus, targetStatus);
        return targetStatus;
    }

    public boolean canTransition(MembershipStatus currentStatus, MembershipStatus targetStatus) {
        validateInput(currentStatus, targetStatus);
        return ALLOWED_TRANSITIONS.getOrDefault(currentStatus, Set.of()).contains(targetStatus);
    }

    private void validateInput(MembershipStatus currentStatus, MembershipStatus targetStatus) {
        if (currentStatus == null || targetStatus == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "회원권 상태 전이 값이 누락되었습니다.");
        }
    }

    private static Map<MembershipStatus, Set<MembershipStatus>> buildAllowedTransitions() {
        Map<MembershipStatus, Set<MembershipStatus>> transitions = new EnumMap<>(MembershipStatus.class);
        transitions.put(MembershipStatus.ACTIVE, EnumSet.of(MembershipStatus.HOLDING, MembershipStatus.REFUNDED, MembershipStatus.EXPIRED));
        transitions.put(MembershipStatus.HOLDING, EnumSet.of(MembershipStatus.ACTIVE, MembershipStatus.REFUNDED, MembershipStatus.EXPIRED));
        transitions.put(MembershipStatus.REFUNDED, EnumSet.noneOf(MembershipStatus.class));
        transitions.put(MembershipStatus.EXPIRED, EnumSet.noneOf(MembershipStatus.class));
        return transitions;
    }
}
