package com.gymcrm.member.service;

import com.gymcrm.audit.AuditLogService;
import com.gymcrm.common.auth.entity.AuthUser;
import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.member.dto.response.MemberWithdrawResponse;
import com.gymcrm.member.entity.Member;
import com.gymcrm.member.enums.MemberStatus;
import com.gymcrm.member.repository.MemberRepository;
import com.gymcrm.membership.repository.MemberMembershipRepository;
import com.gymcrm.membership.service.MembershipHoldService;
import com.gymcrm.membership.service.MembershipRefundService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

@Service
public class MemberWithdrawalService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Seoul");

    private final MemberMembershipRepository memberMembershipRepository;
    private final MembershipHoldService membershipHoldService;
    private final MembershipRefundService membershipRefundService;
    private final MemberRepository memberRepository;
    private final AuditLogService auditLogService;

    public MemberWithdrawalService(
            MemberMembershipRepository memberMembershipRepository,
            MembershipHoldService membershipHoldService,
            MembershipRefundService membershipRefundService,
            MemberRepository memberRepository,
            AuditLogService auditLogService
    ) {
        this.memberMembershipRepository = memberMembershipRepository;
        this.membershipHoldService = membershipHoldService;
        this.membershipRefundService = membershipRefundService;
        this.memberRepository = memberRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public MemberWithdrawResponse withdraw(Member member, AuthUser actor) {
        LocalDate businessDate = LocalDate.now(BUSINESS_ZONE);
        List<MemberMembershipRepository.WithdrawalRelevantMembershipProjection> relevantMemberships =
                memberMembershipRepository.findWithdrawalRelevantMemberships(member.centerId(), member.memberId(), businessDate);

        int resumedHoldingCount = 0;
        List<Long> refundTargetMembershipIds = new ArrayList<>();
        for (MemberMembershipRepository.WithdrawalRelevantMembershipProjection projection : relevantMemberships) {
            if (projection.requiresResumeBeforeRefund()) {
                membershipHoldService.resume(new MembershipHoldService.ResumeRequest(projection.membershipId(), businessDate));
                resumedHoldingCount++;
                refundTargetMembershipIds.add(projection.membershipId());
                continue;
            }
            if (projection.directlyRefundable()) {
                refundTargetMembershipIds.add(projection.membershipId());
            }
        }

        int refundedMembershipCount = 0;
        BigDecimal refundAmount = BigDecimal.ZERO;
        for (Long membershipId : refundTargetMembershipIds) {
            MembershipRefundService.RefundResult refundResult = membershipRefundService.refund(
                    new MembershipRefundService.RefundRequest(
                            membershipId,
                            businessDate,
                            null,
                            null,
                            null,
                            null
                    )
            );
            refundedMembershipCount++;
            refundAmount = refundAmount.add(refundResult.calculation().refundAmount());
        }

        if (MemberStatus.WITHDRAWN == member.memberStatus()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "이미 탈퇴 처리된 회원입니다. memberId=" + member.memberId());
        }

        memberRepository.withdraw(member.memberId(), actor.userId());
        auditLogService.recordEvent(
                "MEMBER_WITHDRAWN",
                "MEMBER",
                String.valueOf(member.memberId()),
                "{\"actorUserId\":%d}".formatted(actor.userId())
        );

        return new MemberWithdrawResponse(
                member.memberId(),
                true,
                refundedMembershipCount,
                resumedHoldingCount,
                refundAmount
        );
    }
}
