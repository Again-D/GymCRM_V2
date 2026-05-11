package com.gymcrm.reservation.service;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.crm.service.CrmMessageService;
import com.gymcrm.membership.repository.MemberMembershipRepository;
import com.gymcrm.membership.repository.MembershipUsageEventRepository;
import com.gymcrm.membership.entity.MemberMembership;
import com.gymcrm.reservation.entity.Reservation;
import com.gymcrm.reservation.entity.TrainerSchedule;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
public class ReservationLifecyclePolicyService {
    private final ReservationPolicyService reservationPolicyService;
    private final MemberMembershipRepository memberMembershipRepository;
    private final MembershipUsageEventRepository membershipUsageEventRepository;
    private final CrmMessageService crmMessageService;

    public ReservationLifecyclePolicyService(
            ReservationPolicyService reservationPolicyService,
            MemberMembershipRepository memberMembershipRepository,
            MembershipUsageEventRepository membershipUsageEventRepository,
            CrmMessageService crmMessageService
    ) {
        this.reservationPolicyService = reservationPolicyService;
        this.memberMembershipRepository = memberMembershipRepository;
        this.membershipUsageEventRepository = membershipUsageEventRepository;
        this.crmMessageService = crmMessageService;
    }

    @Transactional
    public boolean deductCountIfNeeded(
            MemberMembership membership,
            Reservation reservation,
            OffsetDateTime processedAt,
            Long actorUserId,
            String memo,
            boolean onReservationCreation
    ) {
        if (!isCountMembership(membership)) {
            return false;
        }

        String ptDeductionTiming = reservationPolicyService.getResolvedPolicy().ptDeductionTiming();
        boolean shouldDeduct = onReservationCreation
                ? ReservationPolicyService.PT_DEDUCTION_TIMING_RESERVATION.equals(ptDeductionTiming)
                : ReservationPolicyService.PT_DEDUCTION_TIMING_COMPLETION.equals(ptDeductionTiming);
        if (!shouldDeduct) {
            return false;
        }

        memberMembershipRepository.consumeOneCountIfEligible(membership.membershipId(), actorUserId)
                .orElseThrow(() -> new ApiException(ErrorCode.CONFLICT, "차감 가능한 횟수제 회원권이 없습니다."));
        membershipUsageEventRepository.insert(new MembershipUsageEventRepository.InsertCommand(
                reservation.centerId(),
                membership.membershipId(),
                reservation.reservationId(),
                onReservationCreation ? "RESERVATION_CONFIRM" : "RESERVATION_COMPLETE",
                -1,
                processedAt,
                actorUserId,
                memo
        ));
        return true;
    }

    @Transactional
    public void enqueueReservationNotifications(
            Reservation reservation,
            TrainerSchedule schedule,
            Long actorUserId
    ) {
        int reminderLeadMinutes = reservationPolicyService.getResolvedPolicy().reminderLeadMinutes();
        OffsetDateTime reminderAt = schedule.startAt().minusMinutes(reminderLeadMinutes);

        boolean confirmedEnqueued = crmMessageService.enqueueReservationConfirmed(new CrmMessageService.ReservationNotificationRequest(
                reservation.centerId(),
                reservation.memberId(),
                reservation.membershipId(),
                reservation.reservationId(),
                schedule.scheduleId(),
                schedule.startAt(),
                reminderAt,
                actorUserId
        ));
        if (!confirmedEnqueued) {
            throw new ApiException(ErrorCode.CONFLICT, "예약 확정 알림을 등록하지 못했습니다.");
        }

        boolean reminderEnqueued = crmMessageService.enqueueReservationReminder(new CrmMessageService.ReservationNotificationRequest(
                reservation.centerId(),
                reservation.memberId(),
                reservation.membershipId(),
                reservation.reservationId(),
                schedule.scheduleId(),
                schedule.startAt(),
                reminderAt,
                actorUserId
        ));
        if (!reminderEnqueued) {
            throw new ApiException(ErrorCode.CONFLICT, "예약 리마인드 알림을 등록하지 못했습니다.");
        }
    }

    private boolean isCountMembership(MemberMembership membership) {
        return "COUNT".equals(membership.productTypeSnapshot());
    }
}
