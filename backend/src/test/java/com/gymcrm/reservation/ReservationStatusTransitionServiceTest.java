package com.gymcrm.reservation;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ReservationStatusTransitionServiceTest {

    private final ReservationStatusTransitionService service = new ReservationStatusTransitionService();

    @Test
    void allowsConfiguredTransitions() {
        assertTrue(service.canTransition(ReservationStatus.CONFIRMED, ReservationStatus.CANCELLED));
        assertTrue(service.canTransition(ReservationStatus.CONFIRMED, ReservationStatus.COMPLETED));
        assertTrue(service.canTransition(ReservationStatus.CONFIRMED, ReservationStatus.NO_SHOW));
    }

    @Test
    void rejectsTerminalAndSameStateTransitions() {
        assertFalse(service.canTransition(ReservationStatus.CONFIRMED, ReservationStatus.CONFIRMED));
        assertFalse(service.canTransition(ReservationStatus.CANCELLED, ReservationStatus.CONFIRMED));
        assertFalse(service.canTransition(ReservationStatus.COMPLETED, ReservationStatus.CONFIRMED));
        assertFalse(service.canTransition(ReservationStatus.NO_SHOW, ReservationStatus.CONFIRMED));
    }

    @Test
    void throwsBusinessRuleForInvalidTransitionRequest() {
        ApiException exception = assertThrows(
                ApiException.class,
                () -> service.assertTransitionAllowed(ReservationStatus.CANCELLED, ReservationStatus.COMPLETED)
        );

        assertEquals(ErrorCode.BUSINESS_RULE, exception.getErrorCode());
    }

    @Test
    void throwsValidationErrorWhenStatusIsMissing() {
        ApiException exception = assertThrows(
                ApiException.class,
                () -> service.canTransition(null, ReservationStatus.CONFIRMED)
        );

        assertEquals(ErrorCode.VALIDATION_ERROR, exception.getErrorCode());
    }

    @Test
    void transitionReturnsTargetWhenAllowed() {
        ReservationStatus result = service.transition(ReservationStatus.CONFIRMED, ReservationStatus.COMPLETED);

        assertEquals(ReservationStatus.COMPLETED, result);
    }
}
