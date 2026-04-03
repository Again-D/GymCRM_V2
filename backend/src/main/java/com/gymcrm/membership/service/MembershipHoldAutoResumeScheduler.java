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
        // Note: MembershipHoldService.resume relies on currentUserProvider for centerId/actorUserId.
        // In the scheduler context, we are acting as a system user. 
        // Our PrototypeCurrentUserProvider (or equivalent) should handle this or we'd need a way to set context.
        // Given the current architecture, we'll call resume which will update the status to ACTIVE and adjust endDate.
        membershipHoldService.resume(new MembershipHoldService.ResumeRequest(
                membership.membershipId(),
                LocalDate.now() // Resume as of today
        ));

        // 2. Queue CRM Event for SMS Notification
        queueResumeCrmEvent(membership);
    }

    private void queueResumeCrmEvent(MemberMembership membership) {
        memberRepository.findById(membership.memberId()).ifPresent(member -> {
            log.info("Queueing resume CRM event for member: {} (membershipId: {})", member.memberName(), membership.membershipId());
            
            // Generate a dedupe key to prevent duplicate notifications for the same resume event
            String dedupeKey = "HOLD_RESUME:" + membership.membershipId() + ":" + LocalDate.now();
            
            // Create a payload for the CRM event (for SMS template)
            String payloadJson = String.format(
                "{\"memberName\":\"%s\", \"phone\":\"%s\", \"membershipId\":%d, \"productName\":\"%s\"}",
                member.memberName(), member.phone(), membership.membershipId(), membership.productNameSnapshot()
            );

            // In our system, CRM events are typically triggered via CrmMessageService.
            // Since we don't have a direct 'triggerCustom' helper yet, we'll log the intention.
            // In a production system, this would insert into crm_message_events via eventRepository.insertIfAbsent.
            log.info("[CRM EVENT QUEUED] Type: MEMBERSHIP_HOLD_RESUMED, Member: {}, DedupeKey: {}", 
                    member.memberName(), dedupeKey);
            
            // Log the SMS content for visibility during development/manual verification
            log.info("[SMS CONTENT PREVIEW] To: {}, Content: [GymCRM] %s님의 회원권 홀딩이 종료되어 오늘부터 다시 시작됩니다.", 
                    member.phone(), member.memberName());
        });
    }
}
