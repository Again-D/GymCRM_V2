package com.gymcrm.membership.service;

import com.gymcrm.crm.service.CrmMessageService;
import com.gymcrm.member.entity.Member;
import com.gymcrm.member.repository.MemberRepository;
import com.gymcrm.membership.entity.MembershipHold;
import com.gymcrm.membership.repository.MembershipHoldRepository;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class MembershipHoldAutoResumeScheduler {
    private static final Logger log = LoggerFactory.getLogger(MembershipHoldAutoResumeScheduler.class);

    private final MembershipHoldRepository membershipHoldRepository;
    private final MembershipHoldService membershipHoldService;
    private final MemberRepository memberRepository;
    private final CrmMessageService crmMessageService;
    private final Long schedulerActorUserId;

    public MembershipHoldAutoResumeScheduler(
            MembershipHoldRepository membershipHoldRepository,
            MembershipHoldService membershipHoldService,
            MemberRepository memberRepository,
            CrmMessageService crmMessageService,
            @Value("${app.prototype.default-admin-user-id:1}") Long schedulerActorUserId
    ) {
        this.membershipHoldRepository = membershipHoldRepository;
        this.membershipHoldService = membershipHoldService;
        this.memberRepository = memberRepository;
        this.crmMessageService = crmMessageService;
        this.schedulerActorUserId = schedulerActorUserId;
    }

    /**
     * 매일 새벽 00:05에 실행되어 전일까지 종료된 활성 홀드를 자동으로 해제 처리한다.
     * 배치가 하루 이상 누락된 경우에도 미처리 건을 따라잡을 수 있어야 한다.
     */
    @Scheduled(cron = "0 5 0 * * *")
    @Transactional
    public void autoResumeExpiredHolds() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        log.info("Starting MembershipHold auto-resume scan for overdue holdEndDate <= {}", yesterday);

        List<MembershipHold> candidates = membershipHoldRepository.findActiveByHoldEndDateOnOrBefore(yesterday);
        log.info("Found {} candidates for auto-resume", candidates.size());

        for (MembershipHold hold : candidates) {
            try {
                processAutoResume(hold);
            } catch (Exception e) {
                log.error("Failed to auto-resume membershipId: {}", hold.membershipId(), e);
            }
        }
    }

    private void processAutoResume(MembershipHold hold) {
        log.info("Auto-resuming membershipId: {} for holdId: {}", hold.membershipId(), hold.membershipHoldId());

        MembershipHoldService.ResumeResult result = membershipHoldService.resumeByScheduler(
                new MembershipHoldService.ResumeRequest(
                        hold.membershipId(),
                        hold.holdEndDate()
                ),
                schedulerActorUserId
        );

        queueResumeCrmEvent(result);
    }

    private void queueResumeCrmEvent(MembershipHoldService.ResumeResult result) {
        Member member = memberRepository.findById(result.membership().memberId())
                .orElseThrow(() -> new IllegalStateException("회원을 찾을 수 없습니다. memberId=" + result.membership().memberId()));

        boolean inserted = crmMessageService.enqueueMembershipHoldResumed(
                new CrmMessageService.MembershipHoldResumedRequest(
                        result.membership().centerId(),
                        result.membership().memberId(),
                        result.membership().membershipId(),
                        result.hold().membershipHoldId(),
                        member.memberName(),
                        member.phone(),
                        result.membership().productNameSnapshot(),
                        result.hold().holdEndDate(),
                        schedulerActorUserId
                )
        );

        log.info(
                "Queued MEMBERSHIP_HOLD_RESUMED CRM event for membershipId: {} (inserted={})",
                result.membership().membershipId(),
                inserted
        );
    }
}
