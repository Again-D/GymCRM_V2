package com.gymcrm.crm;

import com.gymcrm.common.security.CurrentUserProvider;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class CrmMessageServiceTest {

    @Test
    void processPendingSkipsEventWhenClaimIsNotAcquired() {
        CrmMessageEventRepository eventRepository = mock(CrmMessageEventRepository.class);
        CrmTargetRepository targetRepository = mock(CrmTargetRepository.class);
        CrmMessageSender messageSender = mock(CrmMessageSender.class);
        CrmDispatchClaimService claimService = mock(CrmDispatchClaimService.class);
        CurrentUserProvider currentUserProvider = mock(CurrentUserProvider.class);

        CrmMessageService service = new CrmMessageService(
                eventRepository,
                targetRepository,
                messageSender,
                claimService,
                currentUserProvider
        );

        CrmMessageEvent event = sampleEvent(1001L);
        given(currentUserProvider.currentCenterId()).willReturn(1L);
        given(currentUserProvider.currentUserId()).willReturn(7L);
        given(eventRepository.findDispatchable(any(), any(Integer.class), any(OffsetDateTime.class))).willReturn(List.of(event));
        given(claimService.tryClaim(1L, 1001L)).willReturn(false);

        CrmMessageService.ProcessResult result = service.processPending(new CrmMessageService.ProcessRequest(20));

        assertThat(result.pickedCount()).isZero();
        assertThat(result.sentCount()).isZero();
        assertThat(result.retryWaitCount()).isZero();
        assertThat(result.deadCount()).isZero();
        verify(messageSender, never()).send(any());
        verify(eventRepository, never()).markSent(any());
        verify(eventRepository, never()).markRetryWait(any());
        verify(eventRepository, never()).markDead(any());
    }

    @Test
    void processPendingCountsOnlyClaimedEventsAsPicked() {
        CrmMessageEventRepository eventRepository = mock(CrmMessageEventRepository.class);
        CrmTargetRepository targetRepository = mock(CrmTargetRepository.class);
        CrmMessageSender messageSender = mock(CrmMessageSender.class);
        CrmDispatchClaimService claimService = mock(CrmDispatchClaimService.class);
        CurrentUserProvider currentUserProvider = mock(CurrentUserProvider.class);

        CrmMessageService service = new CrmMessageService(
                eventRepository,
                targetRepository,
                messageSender,
                claimService,
                currentUserProvider
        );

        CrmMessageEvent first = sampleEvent(1001L);
        CrmMessageEvent second = sampleEvent(1002L);
        given(currentUserProvider.currentCenterId()).willReturn(1L);
        given(currentUserProvider.currentUserId()).willReturn(7L);
        given(eventRepository.findDispatchable(any(), any(Integer.class), any(OffsetDateTime.class))).willReturn(List.of(first, second));
        given(claimService.tryClaim(1L, 1001L)).willReturn(false);
        given(claimService.tryClaim(1L, 1002L)).willReturn(true);
        given(messageSender.send(second)).willReturn(new CrmMessageSender.SendResult(true, "stub-1", null));

        CrmMessageService.ProcessResult result = service.processPending(new CrmMessageService.ProcessRequest(20));

        assertThat(result.pickedCount()).isEqualTo(1);
        assertThat(result.sentCount()).isEqualTo(1);
        verify(messageSender).send(second);
        verify(eventRepository).markSent(any());
    }

    private CrmMessageEvent sampleEvent(Long eventId) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        return new CrmMessageEvent(
                eventId,
                1L,
                11L,
                21L,
                "BIRTHDAY_CAMPAIGN",
                "SMS",
                "dedupe-" + eventId,
                "{\"memberName\":\"테스트\"}",
                "PENDING",
                0,
                null,
                now,
                null,
                null,
                null,
                "trace-1",
                now,
                now
        );
    }
}
