package com.gymcrm.crm;

import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.crm.entity.CrmMessageEvent;
import com.gymcrm.crm.entity.CrmMessageTemplate;
import com.gymcrm.crm.repository.CrmMessageEventRepository;
import com.gymcrm.crm.repository.CrmTargetRepository;
import com.gymcrm.crm.service.CrmDispatchClaimService;
import com.gymcrm.crm.service.CrmMessageService;
import com.gymcrm.crm.service.CrmMessageTemplateService;
import com.gymcrm.crm.service.CrmRetryWheelService;

import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;

class CrmMessageServiceTest {

    @Test
    void processPendingSkipsEventWhenClaimIsNotAcquired() {
        CrmMessageEventRepository eventRepository = mock(CrmMessageEventRepository.class);
        CrmTargetRepository targetRepository = mock(CrmTargetRepository.class);
        CrmMessageSender messageSender = mock(CrmMessageSender.class);
        CrmDispatchClaimService claimService = mock(CrmDispatchClaimService.class);
        CrmRetryWheelService retryWheelService = mock(CrmRetryWheelService.class);
        CrmMessageTemplateService templateService = mock(CrmMessageTemplateService.class);
        CurrentUserProvider currentUserProvider = mock(CurrentUserProvider.class);

        CrmMessageService service = new CrmMessageService(
                eventRepository,
                targetRepository,
                messageSender,
                claimService,
                retryWheelService,
                templateService,
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
        CrmRetryWheelService retryWheelService = mock(CrmRetryWheelService.class);
        CrmMessageTemplateService templateService = mock(CrmMessageTemplateService.class);
        CurrentUserProvider currentUserProvider = mock(CurrentUserProvider.class);

        CrmMessageService service = new CrmMessageService(
                eventRepository,
                targetRepository,
                messageSender,
                claimService,
                retryWheelService,
                templateService,
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

    @Test
    void processPendingSchedulesRetryWheelAfterFailure() {
        CrmMessageEventRepository eventRepository = mock(CrmMessageEventRepository.class);
        CrmTargetRepository targetRepository = mock(CrmTargetRepository.class);
        CrmMessageSender messageSender = mock(CrmMessageSender.class);
        CrmDispatchClaimService claimService = mock(CrmDispatchClaimService.class);
        CrmRetryWheelService retryWheelService = mock(CrmRetryWheelService.class);
        CrmMessageTemplateService templateService = mock(CrmMessageTemplateService.class);
        CurrentUserProvider currentUserProvider = mock(CurrentUserProvider.class);

        CrmMessageService service = new CrmMessageService(
                eventRepository,
                targetRepository,
                messageSender,
                claimService,
                retryWheelService,
                templateService,
                currentUserProvider
        );

        CrmMessageEvent event = sampleEvent(1003L);
        given(currentUserProvider.currentCenterId()).willReturn(1L);
        given(currentUserProvider.currentUserId()).willReturn(7L);
        given(eventRepository.findDispatchable(any(), any(Integer.class), any(OffsetDateTime.class))).willReturn(List.of(event));
        given(claimService.tryClaim(1L, 1003L)).willReturn(true);
        given(messageSender.send(event)).willReturn(new CrmMessageSender.SendResult(false, null, "temporary failure"));

        CrmMessageService.ProcessResult result = service.processPending(new CrmMessageService.ProcessRequest(20));

        assertThat(result.retryWaitCount()).isEqualTo(1);
        verify(eventRepository).markRetryWait(any());
        verify(retryWheelService).schedule(any(), any(), any());
    }

    @Test
    void processPendingUsesSmsFallbackWhenPrimarySendFails() {
        CrmMessageEventRepository eventRepository = mock(CrmMessageEventRepository.class);
        CrmTargetRepository targetRepository = mock(CrmTargetRepository.class);
        CrmMessageSender messageSender = mock(CrmMessageSender.class);
        CrmDispatchClaimService claimService = mock(CrmDispatchClaimService.class);
        CrmRetryWheelService retryWheelService = mock(CrmRetryWheelService.class);
        CrmMessageTemplateService templateService = mock(CrmMessageTemplateService.class);
        CurrentUserProvider currentUserProvider = mock(CurrentUserProvider.class);

        CrmMessageService service = new CrmMessageService(
                eventRepository,
                targetRepository,
                messageSender,
                claimService,
                retryWheelService,
                templateService,
                currentUserProvider
        );

        CrmMessageEvent event = sampleEvent(1004L, "KAKAO", "PRIMARY", 0);
        given(currentUserProvider.currentCenterId()).willReturn(1L);
        given(currentUserProvider.currentUserId()).willReturn(7L);
        given(eventRepository.findDispatchable(any(), any(Integer.class), any(OffsetDateTime.class))).willReturn(List.of(event));
        given(claimService.tryClaim(1L, 1004L)).willReturn(true);
        given(messageSender.send(any()))
                .willReturn(new CrmMessageSender.SendResult(false, null, "primary failure"))
                .willReturn(new CrmMessageSender.SendResult(true, "stub-fallback", null));

        CrmMessageService.ProcessResult result = service.processPending(new CrmMessageService.ProcessRequest(20));

        assertThat(result.sentCount()).isEqualTo(1);
        verify(messageSender, times(2)).send(any());
        verify(eventRepository).markSent(argThat(command -> "SMS_FALLBACK".equals(command.deliveryMode())));
        verify(eventRepository, never()).markRetryWait(any());
        verify(eventRepository, never()).markDead(any());
    }

    @Test
    void processPendingMarksDeadWhenSmsFallbackAlsoFails() {
        CrmMessageEventRepository eventRepository = mock(CrmMessageEventRepository.class);
        CrmTargetRepository targetRepository = mock(CrmTargetRepository.class);
        CrmMessageSender messageSender = mock(CrmMessageSender.class);
        CrmDispatchClaimService claimService = mock(CrmDispatchClaimService.class);
        CrmRetryWheelService retryWheelService = mock(CrmRetryWheelService.class);
        CrmMessageTemplateService templateService = mock(CrmMessageTemplateService.class);
        CurrentUserProvider currentUserProvider = mock(CurrentUserProvider.class);

        CrmMessageService service = new CrmMessageService(
                eventRepository,
                targetRepository,
                messageSender,
                claimService,
                retryWheelService,
                templateService,
                currentUserProvider
        );

        CrmMessageEvent event = sampleEvent(1005L, "EMAIL", "PRIMARY", 2);
        given(currentUserProvider.currentCenterId()).willReturn(1L);
        given(currentUserProvider.currentUserId()).willReturn(7L);
        given(eventRepository.findDispatchable(any(), any(Integer.class), any(OffsetDateTime.class))).willReturn(List.of(event));
        given(claimService.tryClaim(1L, 1005L)).willReturn(true);
        given(messageSender.send(any()))
                .willReturn(new CrmMessageSender.SendResult(false, null, "primary failure"))
                .willReturn(new CrmMessageSender.SendResult(false, null, "sms fallback failure"));

        CrmMessageService.ProcessResult result = service.processPending(new CrmMessageService.ProcessRequest(20));

        assertThat(result.deadCount()).isEqualTo(1);
        verify(messageSender, times(2)).send(any());
        verify(eventRepository).markDead(argThat(command ->
                "SMS_FALLBACK".equals(command.deliveryMode())
                        && command.lastErrorMessage() != null
                        && command.lastErrorMessage().contains("fallback")
        ));
        verify(eventRepository, never()).markSent(any());
    }

    @Test
    void triggerLongTermInactiveCampaignRejectsNonSendableTemplate() {
        CrmMessageEventRepository eventRepository = mock(CrmMessageEventRepository.class);
        CrmTargetRepository targetRepository = mock(CrmTargetRepository.class);
        CrmMessageSender messageSender = mock(CrmMessageSender.class);
        CrmDispatchClaimService claimService = mock(CrmDispatchClaimService.class);
        CrmRetryWheelService retryWheelService = mock(CrmRetryWheelService.class);
        CrmMessageTemplateService templateService = mock(CrmMessageTemplateService.class);
        CurrentUserProvider currentUserProvider = mock(CurrentUserProvider.class);

        CrmMessageService service = new CrmMessageService(
                eventRepository,
                targetRepository,
                messageSender,
                claimService,
                retryWheelService,
                templateService,
                currentUserProvider
        );

        given(currentUserProvider.currentCenterId()).willReturn(1L);
        given(currentUserProvider.currentUserId()).willReturn(7L);
        given(templateService.requireSendableTemplate(99L)).willThrow(new com.gymcrm.common.error.ApiException(
                com.gymcrm.common.error.ErrorCode.VALIDATION_ERROR,
                "템플릿은 발송 가능한 상태가 아닙니다. templateId=99"
        ));

        org.junit.jupiter.api.Assertions.assertThrows(
                com.gymcrm.common.error.ApiException.class,
                () -> service.triggerLongTermInactiveCampaign(
                        new CrmMessageService.LongTermInactiveCampaignTriggerRequest(99L, null, 30, null)
                )
        );

        verify(eventRepository, never()).insertIfAbsent(any());
        verify(targetRepository, never()).findLongTermInactiveTargets(any(), any());
    }

    @Test
    void triggerLongTermInactiveCampaignQueuesSendableTemplateTargets() {
        CrmMessageEventRepository eventRepository = mock(CrmMessageEventRepository.class);
        CrmTargetRepository targetRepository = mock(CrmTargetRepository.class);
        CrmMessageSender messageSender = mock(CrmMessageSender.class);
        CrmDispatchClaimService claimService = mock(CrmDispatchClaimService.class);
        CrmRetryWheelService retryWheelService = mock(CrmRetryWheelService.class);
        CrmMessageTemplateService templateService = mock(CrmMessageTemplateService.class);
        CurrentUserProvider currentUserProvider = mock(CurrentUserProvider.class);

        CrmMessageService service = new CrmMessageService(
                eventRepository,
                targetRepository,
                messageSender,
                claimService,
                retryWheelService,
                templateService,
                currentUserProvider
        );

        CrmMessageTemplate template = new CrmMessageTemplate(
                99L,
                1L,
                "INACTIVE_WINBACK",
                "장기 미방문 리마인드",
                "KAKAO",
                "MARKETING",
                "오랜만에 다시 방문해 주세요",
                "APPROVED",
                "SENDABLE",
                true,
                true,
                OffsetDateTime.now(ZoneOffset.UTC),
                OffsetDateTime.now(ZoneOffset.UTC)
        );
        CrmTargetRepository.LongTermInactiveTarget target = new CrmTargetRepository.LongTermInactiveTarget(
                401L,
                "장기미방문회원",
                "010-2222-3333",
                OffsetDateTime.parse("2026-01-01T10:00:00Z")
        );

        given(currentUserProvider.currentCenterId()).willReturn(1L);
        given(currentUserProvider.currentUserId()).willReturn(7L);
        given(templateService.requireSendableTemplate(99L)).willReturn(template);
        given(targetRepository.findLongTermInactiveTargets(any(), any())).willReturn(List.of(target));
        given(eventRepository.insertIfAbsent(any())).willReturn(java.util.Optional.of(sampleEvent(2001L)));

        CrmMessageService.TriggerResult result = service.triggerLongTermInactiveCampaign(
                new CrmMessageService.LongTermInactiveCampaignTriggerRequest(99L, null, 30, null)
        );

        assertThat(result.totalTargets()).isEqualTo(1);
        assertThat(result.createdCount()).isEqualTo(1);
        verify(eventRepository).insertIfAbsent(argThat(command ->
                "LONG_TERM_INACTIVE_CAMPAIGN".equals(command.eventType())
                        && "KAKAO".equals(command.channelType())
                        && "PRIMARY".equals(command.deliveryMode())
        ));
    }

    private CrmMessageEvent sampleEvent(Long eventId) {
        return sampleEvent(eventId, "SMS", "PRIMARY", 0);
    }

    private CrmMessageEvent sampleEvent(Long eventId, String channelType, String deliveryMode, int attemptCount) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        return new CrmMessageEvent(
                eventId,
                1L,
                11L,
                21L,
                "BIRTHDAY_CAMPAIGN",
                channelType,
                deliveryMode,
                "dedupe-" + eventId,
                "{\"memberName\":\"테스트\"}",
                "PENDING",
                attemptCount,
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
