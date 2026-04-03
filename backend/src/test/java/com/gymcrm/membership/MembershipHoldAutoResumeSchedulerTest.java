package com.gymcrm.membership;

import com.gymcrm.crm.service.CrmMessageService;
import com.gymcrm.member.entity.Member;
import com.gymcrm.member.repository.MemberRepository;
import com.gymcrm.membership.entity.MemberMembership;
import com.gymcrm.membership.repository.MemberMembershipRepository;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class MembershipHoldAutoResumeSchedulerTest {

    private final MemberMembershipRepository memberMembershipRepository = mock(MemberMembershipRepository.class);
    private final MembershipHoldService membershipHoldService = mock(MembershipHoldService.class);
    private final MemberRepository memberRepository = mock(MemberRepository.class);
    private final CrmMessageService crmMessageService = mock(CrmMessageService.class);

    private final MembershipHoldAutoResumeScheduler scheduler = new MembershipHoldAutoResumeScheduler(
            memberMembershipRepository,
            membershipHoldService,
            memberRepository,
            crmMessageService
    );

    @Test
    void resumesExpiredHoldsAndLogsCrmEvent() {
        // Given
        LocalDate yesterday = LocalDate.now().minusDays(1);
        MemberMembership membership = new MemberMembership(
                10L, 1L, 100L, 1L, null, "HOLDING", "헬스 90일권", "MEMBERSHIP", "DURATION",
                new BigDecimal("180000"), OffsetDateTime.now(), LocalDate.now().minusDays(30), yesterday,
                null, null, 0, 15, 1, null, OffsetDateTime.now(), 1L, OffsetDateTime.now(), 1L
        );
        
        Member member = mock(Member.class);
        when(member.memberName()).thenReturn("홍길동");
        when(member.phone()).thenReturn("010-1234-5678");

        when(memberMembershipRepository.findByStatusAndEndDate("HOLDING", yesterday))
                .thenReturn(List.of(membership));
        when(memberRepository.findById(100L)).thenReturn(Optional.of(member));

        // When
        scheduler.autoResumeExpiredHolds();

        // Then
        ArgumentCaptor<MembershipHoldService.ResumeRequest> resumeRequestCaptor = ArgumentCaptor.forClass(MembershipHoldService.ResumeRequest.class);
        verify(membershipHoldService).resume(resumeRequestCaptor.capture());
        assertEquals(10L, resumeRequestCaptor.getValue().membershipId());
        assertEquals(LocalDate.now(), resumeRequestCaptor.getValue().resumeDate());

        // Verify that member repository was accessed for notification
        verify(memberRepository).findById(100L);
    }
}
