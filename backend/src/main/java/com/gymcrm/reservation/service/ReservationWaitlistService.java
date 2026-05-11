package com.gymcrm.reservation.service;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.crm.service.CrmMessageService;
import com.gymcrm.member.entity.Member;
import com.gymcrm.member.enums.MemberStatus;
import com.gymcrm.member.repository.MemberRepository;
import com.gymcrm.membership.entity.MemberMembership;
import com.gymcrm.membership.repository.MemberMembershipRepository;
import com.gymcrm.reservation.entity.Reservation;
import com.gymcrm.reservation.entity.ReservationWaitlist;
import com.gymcrm.reservation.entity.TrainerSchedule;
import com.gymcrm.reservation.enums.ReservationStatus;
import com.gymcrm.reservation.repository.ReservationRepository;
import com.gymcrm.reservation.repository.ReservationWaitlistRepository;
import com.gymcrm.reservation.repository.TrainerScheduleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

@Service
public class ReservationWaitlistService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Seoul");
    private static final String GX = "GX";
    private static final String WAITING = "WAITING";
    private static final String EXPIRED = "EXPIRED";

    private final MemberRepository memberRepository;
    private final MemberMembershipRepository memberMembershipRepository;
    private final ReservationRepository reservationRepository;
    private final ReservationWaitlistRepository reservationWaitlistRepository;
    private final TrainerScheduleRepository trainerScheduleRepository;
    private final ReservationLockService reservationLockService;
    private final ReservationLifecyclePolicyService reservationLifecyclePolicyService;
    private final CurrentUserProvider currentUserProvider;
    private final CrmMessageService crmMessageService;

    public ReservationWaitlistService(
            MemberRepository memberRepository,
            MemberMembershipRepository memberMembershipRepository,
            ReservationRepository reservationRepository,
            ReservationWaitlistRepository reservationWaitlistRepository,
            TrainerScheduleRepository trainerScheduleRepository,
            ReservationLockService reservationLockService,
            ReservationLifecyclePolicyService reservationLifecyclePolicyService,
            CurrentUserProvider currentUserProvider,
            CrmMessageService crmMessageService
    ) {
        this.memberRepository = memberRepository;
        this.memberMembershipRepository = memberMembershipRepository;
        this.reservationRepository = reservationRepository;
        this.reservationWaitlistRepository = reservationWaitlistRepository;
        this.trainerScheduleRepository = trainerScheduleRepository;
        this.reservationLockService = reservationLockService;
        this.reservationLifecyclePolicyService = reservationLifecyclePolicyService;
        this.currentUserProvider = currentUserProvider;
        this.crmMessageService = crmMessageService;
    }

    @Transactional
    public ReservationWaitlist create(CreateRequest request) {
        validateCreateRequest(request);

        Long actorCenterId = currentUserProvider.currentCenterId();
        Member member = getMember(request.memberId());
        MemberMembership membership = getMembership(request.membershipId());
        TrainerSchedule schedule = getSchedule(request.scheduleId());
        validateCreateEligibility(member, membership, schedule, actorCenterId);

        Long actorUserId = currentUserProvider.currentUserId();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        return reservationLockService.execute(actorCenterId, schedule.scheduleId(), () -> {
            TrainerSchedule lockedSchedule = getSchedule(schedule.scheduleId());
            if (!GX.equals(lockedSchedule.scheduleType())) {
                throw new ApiException(ErrorCode.BUSINESS_RULE, "GX 수업만 대기 신청을 지원합니다.");
            }
            if (!isFull(lockedSchedule)) {
                throw new ApiException(ErrorCode.BUSINESS_RULE, "정원이 남아 있는 GX 수업은 대기 신청이 필요하지 않습니다.");
            }
            if (reservationRepository.existsConfirmedByMemberAndSchedule(member.memberId(), lockedSchedule.scheduleId())) {
                throw new ApiException(ErrorCode.CONFLICT, "이미 해당 수업에 예약된 회원입니다.");
            }
            if (reservationWaitlistRepository.existsByMemberAndSchedule(member.memberId(), lockedSchedule.scheduleId())) {
                throw new ApiException(ErrorCode.CONFLICT, "이미 대기 신청된 회원입니다.");
            }
            return reservationWaitlistRepository.insert(new ReservationWaitlistRepository.InsertCommand(
                    lockedSchedule.scheduleId(),
                    member.memberId(),
                    membership.membershipId(),
                    now,
                    actorUserId
            ));
        });
    }

    @Transactional(readOnly = true)
    public List<ReservationWaitlist> list(Long scheduleId, String status) {
        return reservationWaitlistRepository.findAll(currentUserProvider.currentCenterId(), scheduleId, normalizeStatus(status));
    }

    @Transactional
    public ReservationWaitlist cancel(CancelRequest request) {
        if (request.waitlistId() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "waitlistId is required");
        }

        Long centerId = currentUserProvider.currentCenterId();
        Long actorUserId = currentUserProvider.currentUserId();
        ReservationWaitlist waitlist = reservationWaitlistRepository.findById(request.waitlistId(), centerId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "대기 신청을 찾을 수 없습니다. waitingId=" + request.waitlistId()));

        return reservationLockService.execute(centerId, waitlist.scheduleId(), () -> reservationWaitlistRepository.markCancelledIfCurrent(
                new ReservationWaitlistRepository.CancelCommand(waitlist.waitingId(), OffsetDateTime.now(ZoneOffset.UTC), actorUserId)
        ).orElseThrow(() -> new ApiException(ErrorCode.CONFLICT, "대기 신청 상태가 변경되어 취소할 수 없습니다.")));
    }

    @Transactional
    public Optional<PromotionResult> promoteNextIfEligible(TrainerSchedule schedule, Long actorUserId) {
        if (!GX.equals(schedule.scheduleType())) {
            return Optional.empty();
        }

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        Optional<ReservationWaitlist> next = reservationWaitlistRepository.findNextWaiting(schedule.scheduleId());
        while (next.isPresent()) {
            ReservationWaitlist current = next.get();
            if (!isPromotable(current, schedule)) {
                reservationWaitlistRepository.markExpiredIfCurrent(new ReservationWaitlistRepository.ExpireCommand(
                        current.waitingId(),
                        now,
                        actorUserId
                ));
                next = reservationWaitlistRepository.findNextWaiting(schedule.scheduleId());
                continue;
            }

            trainerScheduleRepository.incrementCurrentCountIfAvailable(schedule.scheduleId(), actorUserId)
                    .orElseThrow(() -> new ApiException(ErrorCode.CONFLICT, "대기 전환 가능한 정원이 없습니다."));

            Reservation promotedReservation = reservationRepository.insert(new ReservationRepository.ReservationCreateCommand(
                    schedule.centerId(),
                    current.memberId(),
                    current.membershipId(),
                    schedule.scheduleId(),
                    ReservationStatus.CONFIRMED.name(),
                    now,
                    "대기 전환 예약",
                    actorUserId
            ));

            reservationLifecyclePolicyService.deductCountIfNeeded(
                    getMembership(current.membershipId()),
                    promotedReservation,
                    now,
                    actorUserId,
                    "대기 전환 예약에 따른 횟수 차감",
                    true
            );
            reservationLifecyclePolicyService.enqueueReservationNotifications(promotedReservation, schedule, actorUserId);

            ReservationWaitlist promotedWaitlist = reservationWaitlistRepository.markPromotedIfCurrent(
                    new ReservationWaitlistRepository.PromoteCommand(
                            current.waitingId(),
                            promotedReservation.reservationId(),
                            now,
                            actorUserId
                    )
            ).orElseThrow(() -> new ApiException(ErrorCode.CONFLICT, "대기 신청 상태가 변경되어 전환할 수 없습니다."));

            boolean enqueued = crmMessageService.enqueueReservationWaitlistPromoted(new CrmMessageService.ReservationWaitlistPromotedRequest(
                    schedule.centerId(),
                    current.memberId(),
                    current.membershipId(),
                    schedule.scheduleId(),
                    promotedReservation.reservationId(),
                    current.waitingId(),
                    current.queueOrder(),
                    now
            ));
            if (!enqueued) {
                throw new ApiException(ErrorCode.CONFLICT, "대기 전환 알림을 등록하지 못했습니다.");
            }

            return Optional.of(new PromotionResult(promotedWaitlist, promotedReservation));
        }

        return Optional.empty();
    }

    private boolean isFull(TrainerSchedule schedule) {
        return schedule.currentCount() != null
                && schedule.capacity() != null
                && schedule.currentCount() >= schedule.capacity();
    }

    private boolean isPromotable(ReservationWaitlist waitlist, TrainerSchedule schedule) {
        if (!WAITING.equals(waitlist.status())) {
            return false;
        }
        Member member = getMember(waitlist.memberId());
        MemberMembership membership = getMembership(waitlist.membershipId());
        if (member.memberStatus() != MemberStatus.ACTIVE) {
            return false;
        }
        if (!member.centerId().equals(schedule.centerId()) || !membership.centerId().equals(schedule.centerId())) {
            return false;
        }
        if (!"ACTIVE".equals(membership.membershipStatus())) {
            return false;
        }
        LocalDate businessDate = LocalDate.now(BUSINESS_ZONE);
        return membership.endDate() == null || !membership.endDate().isBefore(businessDate);
    }

    private void validateCreateRequest(CreateRequest request) {
        if (request.memberId() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "memberId is required");
        }
        if (request.membershipId() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "membershipId is required");
        }
        if (request.scheduleId() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "scheduleId is required");
        }
    }

    private void validateCreateEligibility(Member member, MemberMembership membership, TrainerSchedule schedule, Long actorCenterId) {
        if (member.memberStatus() != MemberStatus.ACTIVE) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "비활성 회원은 대기 신청할 수 없습니다.");
        }
        if (!member.centerId().equals(actorCenterId)) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "현재 사용자 센터에서만 대기 신청을 생성할 수 있습니다.");
        }
        if (!member.memberId().equals(membership.memberId())) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "회원과 회원권이 일치하지 않습니다.");
        }
        if (!member.centerId().equals(membership.centerId()) || !member.centerId().equals(schedule.centerId())) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "센터 정보가 일치하지 않습니다.");
        }
        if (!"ACTIVE".equals(membership.membershipStatus())) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "ACTIVE 상태 회원권만 대기 신청에 사용할 수 있습니다.");
        }
        LocalDate businessDate = LocalDate.now(BUSINESS_ZONE);
        if (membership.endDate() != null && membership.endDate().isBefore(businessDate)) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "만료된 회원권은 대기 신청에 사용할 수 없습니다.");
        }
        if ("COUNT".equals(membership.productTypeSnapshot()) && (membership.remainingCount() == null || membership.remainingCount() <= 0)) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "잔여 횟수가 없는 횟수제 회원권은 대기 신청에 사용할 수 없습니다.");
        }
        if (!schedule.startAt().atZoneSameInstant(BUSINESS_ZONE).isAfter(OffsetDateTime.now(ZoneOffset.UTC).atZoneSameInstant(BUSINESS_ZONE))) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "과거 슬롯은 대기 신청할 수 없습니다.");
        }
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return WAITING;
        }
        String normalized = status.trim().toUpperCase();
        if (!normalized.equals("WAITING") && !normalized.equals("PROMOTED") && !normalized.equals("CANCELLED") && !normalized.equals(EXPIRED)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "status filter is invalid");
        }
        return normalized;
    }

    private Member getMember(Long memberId) {
        return memberRepository.findById(memberId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "회원을 찾을 수 없습니다. memberId=" + memberId));
    }

    private MemberMembership getMembership(Long membershipId) {
        return memberMembershipRepository.findById(membershipId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "회원권을 찾을 수 없습니다. membershipId=" + membershipId));
    }

    private TrainerSchedule getSchedule(Long scheduleId) {
        return trainerScheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "스케줄을 찾을 수 없습니다. scheduleId=" + scheduleId));
    }

    public record CreateRequest(
            Long memberId,
            Long membershipId,
            Long scheduleId
    ) {
    }

    public record CancelRequest(
            Long waitlistId
    ) {
    }

    public record PromotionResult(
            ReservationWaitlist waitlist,
            Reservation reservation
    ) {
    }
}
