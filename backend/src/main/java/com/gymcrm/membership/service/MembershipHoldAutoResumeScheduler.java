package com.gymcrm.membership.service;

import com.gymcrm.crm.service.CrmMessageService;
import com.gymcrm.member.repository.MemberRepository;
import com.gymcrm.membership.entity.MemberMembership;
import com.gymcrm.membership.repository.MemberMembershipRepository;
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

    private final MemberMembershipRepository memberMembershipRepository;
    private final MembershipHoldService membershipHoldService;
    private final MemberRepository memberRepository;
    private final CrmMessageService crmMessageService;

    public MembershipHoldAutoResumeScheduler(
            MemberMembershipRepository memberMembershipRepository,
            MembershipHoldService membershipHoldService,
            MemberRepository memberRepository,
            CrmMessageService crmMessageService
    ) {
        this.memberMembershipRepository = memberMembershipRepository;
        this.membershipHoldService = membershipHoldService;
        this.memberRepository = memberRepository;
        this.crmMessageService = crmMessageService;
    }

    /**
     * 매일 새벽 00:05에 실행되어 어제가 홀딩 종료일이었던 회원권을 자동으로 해제 처리한다.
     */
    @Scheduled(cron = "0 5 0 * * *")
    @Transactional
    public void autoResumeExpiredHolds() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        log.info("Starting MembershipHold auto-resume scan for holdEndDate: {}", yesterday);

        List<MemberMembership> candidates = memberMembershipRepository.findByStatusAndEndDate("HOLDING", yesterday);
        log.info("Found {} candidates for auto-resume", candidates.size());

        for (MemberMembership membership : candidates) {
            try {
                processAutoResume(membership);
            } catch (Exception e) {
                log.error("Failed to auto-resume membershipId: {}", membership.membershipId(), e);
            }
        }
    }

    private void processAutoResume(MemberMembership membership) {
        log.info("Auto-resuming membershipId: {}", membership.membershipId());
        
        // 1. Resume Processing
        // Note: MembershipHoldService.resume relies on currentUserProvider.
        // In prototype mode, PrototypeCurrentUserProvider returns default values (ID 1).
        MembershipHoldService.ResumeRequest resumeRequest = new MembershipHoldService.ResumeRequest(
                membership.membershipId(),
                LocalDate.now() // Resume as of today (day after endDate)
        );
        
        membershipHoldService.resume(resumeRequest);

        // 2. Send SMS Notification
        sendResumeNotification(membership);
    }

    private void sendResumeNotification(MemberMembership membership) {
        memberRepository.findById(membership.memberId()).ifPresent(member -> {
            log.info("Sending hold resume notification to member: {}", member.memberName());
            
            // 패턴상 아직 자동 해제 전용 캠페인이 없으므로 로그로 대체한다.
            log.info("[SMS SENT] To: {}, Content: [GymCRM] {}님의 회원권 홀딩이 종료되어 오늘부터 다시 시작됩니다.", 
                    member.phone(), member.memberName());
        });
    }
}
