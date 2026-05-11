package com.gymcrm.member;

import com.gymcrm.audit.AuditLogService;
import com.gymcrm.common.auth.entity.AuthUser;
import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.member.dto.response.MemberWithdrawResponse;
import com.gymcrm.member.entity.Member;
import com.gymcrm.member.enums.Gender;
import com.gymcrm.member.enums.MemberStatus;
import com.gymcrm.member.repository.MemberRepository;
import com.gymcrm.member.service.MemberWithdrawalService;
import com.gymcrm.membership.entity.MemberMembership;
import com.gymcrm.membership.entity.MembershipRefund;
import com.gymcrm.membership.enums.RefundStatus;
import com.gymcrm.membership.repository.MemberMembershipRepository;
import com.gymcrm.membership.service.MembershipHoldService;
import com.gymcrm.membership.service.MembershipRefundService;
import com.gymcrm.settlement.entity.Payment;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MemberWithdrawalServiceTest {

    private final MemberMembershipRepository memberMembershipRepository = mock(MemberMembershipRepository.class);
    private final MembershipHoldService membershipHoldService = mock(MembershipHoldService.class);
    private final MembershipRefundService membershipRefundService = mock(MembershipRefundService.class);
    private final MemberRepository memberRepository = mock(MemberRepository.class);
    private final AuditLogService auditLogService = mock(AuditLogService.class);

    private final MemberWithdrawalService service = new MemberWithdrawalService(
            memberMembershipRepository,
            membershipHoldService,
            membershipRefundService,
            memberRepository,
            auditLogService
    );

    @Test
    void withdrawProcessesHoldingByResumeThenRefundBeforeFinalMemberWithdraw() {
        Member member = sampleMember(MemberStatus.ACTIVE);
        AuthUser actor = sampleActor();
        MemberMembershipRepository.WithdrawalRelevantMembershipProjection holding =
                new MemberMembershipRepository.WithdrawalRelevantMembershipProjection(
                        11L,
                        "HOLDING",
                        "MEMBERSHIP",
                        "DURATION",
                        LocalDate.of(2026, 6, 1),
                        null,
                        member.memberId(),
                        member.centerId()
                );
        MemberMembershipRepository.WithdrawalRelevantMembershipProjection active =
                new MemberMembershipRepository.WithdrawalRelevantMembershipProjection(
                        12L,
                        "ACTIVE",
                        "PT",
                        "COUNT",
                        null,
                        5,
                        member.memberId(),
                        member.centerId()
                );

        when(memberMembershipRepository.findWithdrawalRelevantMemberships(anyLong(), anyLong(), any()))
                .thenReturn(List.of(holding, active));
        when(membershipRefundService.refund(any()))
                .thenReturn(refundResult(BigDecimal.valueOf(40000)))
                .thenReturn(refundResult(BigDecimal.valueOf(10000)));

        MemberWithdrawResponse response = service.withdraw(member, actor);

        assertEquals(member.memberId(), response.memberId());
        assertEquals(true, response.withdrawn());
        assertEquals(2, response.refundedMembershipCount());
        assertEquals(1, response.resumedHoldingCount());
        assertEquals(BigDecimal.valueOf(50000), response.refundAmount());
        verify(membershipHoldService).resume(any());
        verify(memberRepository).withdraw(member.memberId(), actor.userId());
        verify(auditLogService).recordEvent(
                member.centerId(),
                actor.userId(),
                "MEMBER_WITHDRAWN",
                "MEMBER",
                String.valueOf(member.memberId()),
                "{\"actorUserId\":99}"
        );
    }

    @Test
    void withdrawAbortsBeforeMemberWithdrawWhenResumeFails() {
        Member member = sampleMember(MemberStatus.ACTIVE);
        AuthUser actor = sampleActor();
        MemberMembershipRepository.WithdrawalRelevantMembershipProjection holding =
                new MemberMembershipRepository.WithdrawalRelevantMembershipProjection(
                        11L,
                        "HOLDING",
                        "MEMBERSHIP",
                        "DURATION",
                        LocalDate.of(2026, 6, 1),
                        null,
                        member.memberId(),
                        member.centerId()
                );
        when(memberMembershipRepository.findWithdrawalRelevantMemberships(anyLong(), anyLong(), any()))
                .thenReturn(List.of(holding));
        when(membershipHoldService.resume(any()))
                .thenThrow(new ApiException(ErrorCode.BUSINESS_RULE, "resume failed"));

        assertThrows(ApiException.class, () -> service.withdraw(member, actor));

        verify(membershipRefundService, never()).refund(any());
        verify(memberRepository, never()).withdraw(anyLong(), anyLong());
        verify(auditLogService, never()).recordEvent(any(), any(), any(), any());
    }

    @Test
    void withdrawAbortsBeforeMemberWithdrawWhenRefundFails() {
        Member member = sampleMember(MemberStatus.ACTIVE);
        AuthUser actor = sampleActor();
        MemberMembershipRepository.WithdrawalRelevantMembershipProjection active =
                new MemberMembershipRepository.WithdrawalRelevantMembershipProjection(
                        12L,
                        "ACTIVE",
                        "PT",
                        "COUNT",
                        null,
                        5,
                        member.memberId(),
                        member.centerId()
                );
        when(memberMembershipRepository.findWithdrawalRelevantMemberships(anyLong(), anyLong(), any()))
                .thenReturn(List.of(active));
        when(membershipRefundService.refund(any()))
                .thenThrow(new ApiException(ErrorCode.BUSINESS_RULE, "refund failed"));

        assertThrows(ApiException.class, () -> service.withdraw(member, actor));

        verify(memberRepository, never()).withdraw(anyLong(), anyLong());
        verify(auditLogService, never()).recordEvent(any(), any(), any(), any());
    }

    @Test
    void withdrawFailsFastWhenMemberAlreadyWithdrawnBeforeSideEffects() {
        Member member = sampleMember(MemberStatus.WITHDRAWN);
        AuthUser actor = sampleActor();

        ApiException exception = assertThrows(ApiException.class, () -> service.withdraw(member, actor));

        assertEquals(ErrorCode.VALIDATION_ERROR, exception.getErrorCode());
        verify(memberMembershipRepository, never()).findWithdrawalRelevantMemberships(anyLong(), anyLong(), any());
        verify(membershipHoldService, never()).resume(any());
        verify(membershipRefundService, never()).refund(any());
        verify(memberRepository, never()).withdraw(anyLong(), anyLong());
        verify(auditLogService, never()).recordEvent(any(), any(), any(), any());
    }

    private Member sampleMember(MemberStatus status) {
        OffsetDateTime now = OffsetDateTime.parse("2026-05-08T00:00:00Z");
        return new Member(
                1L,
                1L,
                "MBR-2026-000001",
                "테스트회원",
                "010-1111-2222",
                null,
                null,
                Gender.FEMALE,
                LocalDate.of(2000, 1, 1),
                null,
                1,
                status,
                LocalDate.of(2026, 1, 1),
                true,
                false,
                null,
                null,
                null,
                now,
                1L,
                now,
                1L
        );
    }

    private AuthUser sampleActor() {
        return new AuthUser(
                99L,
                1L,
                "center-admin",
                "pw",
                "센터관리자",
                "010-9999-9999",
                "ROLE_MANAGER",
                "ACTIVE",
                false,
                null,
                null,
                null
        );
    }

    private MembershipRefundService.RefundResult refundResult(BigDecimal amount) {
        OffsetDateTime now = OffsetDateTime.now();
        return new MembershipRefundService.RefundResult(
                new MemberMembership(
                        1L, 1L, 1L, 1L, null, "REFUNDED",
                        "상품", "MEMBERSHIP", "DURATION",
                        BigDecimal.valueOf(100000),
                        now,
                        LocalDate.of(2026, 1, 1),
                        LocalDate.of(2026, 1, 31),
                        null,
                        null,
                        0,
                        0,
                        0,
                        null,
                        now,
                        1L,
                        now,
                        1L
                ),
                new MembershipRefund(
                        1L,
                        1L,
                        1L,
                        1L,
                        RefundStatus.COMPLETED,
                        null,
                        now,
                        now,
                        BigDecimal.valueOf(100000),
                        BigDecimal.ZERO,
                        BigDecimal.ZERO,
                        amount,
                        null,
                        now,
                        1L,
                        now,
                        1L
                ),
                new Payment(
                        1L,
                        1L,
                        1L,
                        1L,
                        "REFUND",
                        "COMPLETED",
                        "CASH",
                        amount,
                        now,
                        null,
                        null,
                        now,
                        1L,
                        now,
                        1L
                ),
                new MembershipRefundService.RefundCalculation(
                        LocalDate.now(),
                        BigDecimal.valueOf(100000),
                        BigDecimal.ZERO,
                        BigDecimal.ZERO,
                        amount
                )
        );
    }
}
