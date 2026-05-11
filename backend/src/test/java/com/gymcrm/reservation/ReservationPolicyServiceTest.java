package com.gymcrm.reservation;

import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.reservation.service.ReservationPolicyService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ReservationPolicyServiceTest {
    @Test
    void resolvesBackendDefaultsPerCenter() {
        CurrentUserProvider currentUserProvider = Mockito.mock(CurrentUserProvider.class);
        Mockito.when(currentUserProvider.currentCenterId()).thenReturn(1L, 2L);

        ReservationPolicyService service = new ReservationPolicyService(currentUserProvider);

        ReservationPolicyService.ResolvedReservationPolicy first = service.getResolvedPolicy();
        ReservationPolicyService.ResolvedReservationPolicy second = service.getResolvedPolicy();

        assertEquals(1L, first.centerId());
        assertEquals("BACKEND_DEFAULT", first.source());
        assertEquals("COMPLETION", first.ptDeductionTiming());
        assertEquals("AUTO_PROMOTION", first.gxWaitlistMode());
        assertEquals(120, first.cancellationCutoffMinutes());
        assertEquals(120, first.reminderLeadMinutes());

        assertEquals(2L, second.centerId());
        assertEquals("BACKEND_DEFAULT", second.source());
        assertEquals("COMPLETION", second.ptDeductionTiming());
        assertEquals("AUTO_PROMOTION", second.gxWaitlistMode());
        assertEquals(120, second.cancellationCutoffMinutes());
        assertEquals(120, second.reminderLeadMinutes());
    }
}
