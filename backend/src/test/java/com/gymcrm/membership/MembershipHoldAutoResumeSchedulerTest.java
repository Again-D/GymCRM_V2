package com.gymcrm.membership;

import com.gymcrm.crm.service.CrmMessageService;
import com.gymcrm.member.entity.Member;
import com.gymcrm.member.repository.MemberRepository;
import com.gymcrm.membership.entity.MemberMembership;
import com.gymcrm.membership.entity.MembershipHold;
import com.gymcrm.membership.enums.HoldStatus;
import com.gymcrm.membership.repository.MembershipHoldRepository;
import com.gymcrm.membership.service.MembershipHoldAutoResumeScheduler;
import com.gymcrm.membership.service.MembershipHoldService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class MembershipHoldAutoResumeSchedulerTest {

    private final MembershipHoldRepository membershipHoldRepository = mock(MembershipHoldRepository.class);
    private final MembershipHoldService membershipHoldService = mock(MembershipHoldService.class);
    private final MemberRepository memberRepository = mock(MemberRepository.class);
    private final CrmMessageService crmMessageService = mock(CrmMessageService.class);

    private final MembershipHoldAutoResumeScheduler scheduler = new MembershipHoldAutoResumeScheduler(
            membershipHoldRepository,
            membershipHoldService,
            memberRepository,
            crmMessageService,
            1L
    );

    @Test
    void resumesExpiredHoldsAndEnqueuesCrmEvent() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        MembershipHold hold = new MembershipHold(
                77L,
                1L,
                10L,
                HoldStatus.ACTIVE,
                yesterday.minusDays(3),
                yesterday,
                null,
                null,
                "여행",
                null,
                false,
                OffsetDateTime.now(),
                1L,
                OffsetDateTime.now(),
                1L
        );
        MemberMembership membership = new MemberMembership(
                10L, 1L, 100L, 1L, null, "ACTIVE", "헬스 90일권", "MEMBERSHIP", "DURATION",
                new BigDecimal("180000"), OffsetDateTime.now(), LocalDate.now().minusDays(30), LocalDate.now().plusDays(20),
                null, null, 0, 15, 1, null, OffsetDateTime.now(), 1L, OffsetDateTime.now(), 1L
        );
        Member member = new Member(
                100L, 1L, "M-100", "홍길동", "010-1234-5678", null, null, null, null, null,
                null, null, LocalDate.now().minusDays(100), true, false, null, OffsetDateTime.now(), 1L, OffsetDateTime.now(), 1L
        );
        MembershipHold resumedHold = new MembershipHold(
                77L,
                1L,
                10L,
                HoldStatus.RESUMED,
                yesterday.minusDays(3),
                yesterday,
                OffsetDateTime.now(),
                4,
                "여행",
                null,
                false,
                OffsetDateTime.now(),
                1L,
                OffsetDateTime.now(),
                1L
        );

        when(membershipHoldRepository.findActiveByHoldEndDateOnOrBefore(yesterday)).thenReturn(List.of(hold));
        when(membershipHoldService.resumeByScheduler(any(MembershipHoldService.ResumeRequest.class), eq(1L)))
                .thenReturn(new MembershipHoldService.ResumeResult(membership, resumedHold, 4, membership.endDate()));
        when(memberRepository.findById(100L)).thenReturn(Optional.of(member));
        when(crmMessageService.enqueueMembershipHoldResumed(any(CrmMessageService.MembershipHoldResumedRequest.class)))
                .thenReturn(true);

        scheduler.autoResumeExpiredHolds();

        ArgumentCaptor<MembershipHoldService.ResumeRequest> resumeRequestCaptor = ArgumentCaptor.forClass(MembershipHoldService.ResumeRequest.class);
        verify(membershipHoldService).resumeByScheduler(resumeRequestCaptor.capture(), eq(1L));
        assertEquals(10L, resumeRequestCaptor.getValue().membershipId());
        assertEquals(yesterday, resumeRequestCaptor.getValue().resumeDate());

        verify(memberRepository).findById(100L);
        verify(crmMessageService).enqueueMembershipHoldResumed(any(CrmMessageService.MembershipHoldResumedRequest.class));
    }

    @Test
    void catchesUpOverdueHoldsWhenPreviousRunWasMissed() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        LocalDate twoDaysAgo = yesterday.minusDays(1);
        MembershipHold overdueHold = new MembershipHold(
                78L,
                1L,
                11L,
                HoldStatus.ACTIVE,
                twoDaysAgo.minusDays(2),
                twoDaysAgo,
                null,
                null,
                "출장",
                null,
                false,
                OffsetDateTime.now(),
                1L,
                OffsetDateTime.now(),
                1L
        );
        MemberMembership membership = new MemberMembership(
                11L, 1L, 101L, 1L, null, "ACTIVE", "PT 10회권", "MEMBERSHIP", "COUNT",
                new BigDecimal("550000"), OffsetDateTime.now(), LocalDate.now().minusDays(20), LocalDate.now().plusDays(30),
                null, 10, 0, 3, 0, null, OffsetDateTime.now(), 1L, OffsetDateTime.now(), 1L
        );
        Member member = new Member(
                101L, 1L, "M-101", "김회원", "010-9999-0000", null, null, null, null, null,
                null, null, LocalDate.now().minusDays(120), true, false, null, OffsetDateTime.now(), 1L, OffsetDateTime.now(), 1L
        );
        MembershipHold resumedHold = new MembershipHold(
                78L,
                1L,
                11L,
                HoldStatus.RESUMED,
                twoDaysAgo.minusDays(2),
                twoDaysAgo,
                OffsetDateTime.now(),
                3,
                "출장",
                null,
                false,
                OffsetDateTime.now(),
                1L,
                OffsetDateTime.now(),
                1L
        );

        when(membershipHoldRepository.findActiveByHoldEndDateOnOrBefore(yesterday)).thenReturn(List.of(overdueHold));
        when(membershipHoldService.resumeByScheduler(any(MembershipHoldService.ResumeRequest.class), eq(1L)))
                .thenReturn(new MembershipHoldService.ResumeResult(membership, resumedHold, 3, membership.endDate()));
        when(memberRepository.findById(101L)).thenReturn(Optional.of(member));
        when(crmMessageService.enqueueMembershipHoldResumed(any(CrmMessageService.MembershipHoldResumedRequest.class)))
                .thenReturn(true);

        scheduler.autoResumeExpiredHolds();

        ArgumentCaptor<MembershipHoldService.ResumeRequest> resumeRequestCaptor = ArgumentCaptor.forClass(MembershipHoldService.ResumeRequest.class);
        verify(membershipHoldService).resumeByScheduler(resumeRequestCaptor.capture(), eq(1L));
        assertEquals(11L, resumeRequestCaptor.getValue().membershipId());
        assertEquals(twoDaysAgo, resumeRequestCaptor.getValue().resumeDate());
    }
}
