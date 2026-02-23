package com.gymcrm.membership;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MembershipStatusTransitionServiceTest {

    private final MembershipStatusTransitionService service = new MembershipStatusTransitionService();

    @Test
    void allowsConfiguredTransitions() {
        assertTrue(service.canTransition(MembershipStatus.ACTIVE, MembershipStatus.HOLDING));
        assertTrue(service.canTransition(MembershipStatus.ACTIVE, MembershipStatus.REFUNDED));
        assertTrue(service.canTransition(MembershipStatus.ACTIVE, MembershipStatus.EXPIRED));
        assertTrue(service.canTransition(MembershipStatus.HOLDING, MembershipStatus.ACTIVE));
        assertTrue(service.canTransition(MembershipStatus.HOLDING, MembershipStatus.REFUNDED));
        assertTrue(service.canTransition(MembershipStatus.HOLDING, MembershipStatus.EXPIRED));
    }

    @Test
    void rejectsTerminalAndSameStateTransitions() {
        assertFalse(service.canTransition(MembershipStatus.REFUNDED, MembershipStatus.ACTIVE));
        assertFalse(service.canTransition(MembershipStatus.EXPIRED, MembershipStatus.ACTIVE));
        assertFalse(service.canTransition(MembershipStatus.ACTIVE, MembershipStatus.ACTIVE));
        assertFalse(service.canTransition(MembershipStatus.HOLDING, MembershipStatus.HOLDING));
    }

    @Test
    void throwsBusinessRuleForInvalidTransitionRequest() {
        ApiException exception = assertThrows(
                ApiException.class,
                () -> service.assertTransitionAllowed(MembershipStatus.EXPIRED, MembershipStatus.ACTIVE)
        );

        assertEquals(ErrorCode.BUSINESS_RULE, exception.getErrorCode());
    }

    @Test
    void throwsValidationErrorWhenStatusIsMissing() {
        ApiException exception = assertThrows(
                ApiException.class,
                () -> service.canTransition(null, MembershipStatus.ACTIVE)
        );

        assertEquals(ErrorCode.VALIDATION_ERROR, exception.getErrorCode());
    }

    @Test
    void transitionReturnsTargetWhenAllowed() {
        MembershipStatus result = service.transition(MembershipStatus.HOLDING, MembershipStatus.ACTIVE);

        assertEquals(MembershipStatus.ACTIVE, result);
    }
}
