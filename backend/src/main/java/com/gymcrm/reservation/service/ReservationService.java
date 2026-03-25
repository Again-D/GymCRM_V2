package com.gymcrm.reservation.service;

import com.gymcrm.common.auth.entity.AuthUser;
import com.gymcrm.common.auth.repository.AuthUserRepository;
import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.member.service.MemberService;
import com.gymcrm.member.entity.Member;
import com.gymcrm.member.enums.MemberStatus;
import com.gymcrm.membership.entity.MemberMembership;
import com.gymcrm.membership.repository.MemberMembershipRepository;
import com.gymcrm.membership.repository.MembershipUsageEventRepository;
import com.gymcrm.reservation.entity.Reservation;
import com.gymcrm.reservation.entity.TrainerSchedule;
import com.gymcrm.reservation.enums.ReservationStatus;
import com.gymcrm.reservation.repository.ReservationQueryRepository;
import com.gymcrm.reservation.repository.ReservationRepository;
import com.gymcrm.reservation.repository.TrainerScheduleRepository;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;

@Service
public class ReservationService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Seoul");

    private final MemberService memberService;
    private final AuthUserRepository authUserRepository;
    private final MemberMembershipRepository memberMembershipRepository;
    private final TrainerScheduleRepository trainerScheduleRepository;
    private final ReservationRepository reservationRepository;
    private final ReservationQueryRepository reservationQueryRepository;
    private final ReservationLockService reservationLockService;
    private final ReservationStatusTransitionService reservationStatusTransitionService;
    private final CurrentUserProvider currentUserProvider;
    private final MembershipUsageEventRepository membershipUsageEventRepository;

    public ReservationService(
            MemberService memberService,
            AuthUserRepository authUserRepository,
            MemberMembershipRepository memberMembershipRepository,
            TrainerScheduleRepository trainerScheduleRepository,
            ReservationRepository reservationRepository,
            ReservationQueryRepository reservationQueryRepository,
            ReservationLockService reservationLockService,
            ReservationStatusTransitionService reservationStatusTransitionService,
            CurrentUserProvider currentUserProvider,
            MembershipUsageEventRepository membershipUsageEventRepository
    ) {
        this.memberService = memberService;
        this.authUserRepository = authUserRepository;
        this.memberMembershipRepository = memberMembershipRepository;
        this.trainerScheduleRepository = trainerScheduleRepository;
        this.reservationRepository = reservationRepository;
        this.reservationQueryRepository = reservationQueryRepository;
        this.reservationLockService = reservationLockService;
        this.reservationStatusTransitionService = reservationStatusTransitionService;
        this.currentUserProvider = currentUserProvider;
        this.membershipUsageEventRepository = membershipUsageEventRepository;
    }

    @Transactional
    public Reservation create(CreateRequest request) {
        validateCreateRequest(request);

        Long actorCenterId = currentUserProvider.currentCenterId();
        Member member = memberService.get(request.memberId());
        MemberMembership membership = getMembership(request.membershipId());
        TrainerSchedule schedule = getSchedule(request.scheduleId());
        validateCreateEligibility(member, membership, schedule, actorCenterId);
        guardTrainerMembershipAccess(membership);

        Long actorUserId = currentUserProvider.currentUserId();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        return reservationLockService.execute(actorCenterId, schedule.scheduleId(), () -> {
            try {
                if (reservationRepository.existsConfirmedByMemberAndSchedule(member.memberId(), schedule.scheduleId())) {
                    throw new ApiException(ErrorCode.CONFLICT, "동일 회원의 동일 슬롯 중복 예약은 허용되지 않습니다.");
                }

                TrainerSchedule updatedSchedule = trainerScheduleRepository.incrementCurrentCountIfAvailable(schedule.scheduleId(), actorUserId)
                        .orElseThrow(() -> new ApiException(ErrorCode.CONFLICT, "예약 가능한 정원이 없습니다."));

                if (updatedSchedule.currentCount() == null || updatedSchedule.capacity() == null
                        || updatedSchedule.currentCount() > updatedSchedule.capacity()) {
                    throw new ApiException(ErrorCode.CONFLICT, "예약 가능한 정원이 없습니다.");
                }

                return reservationRepository.insert(new ReservationRepository.ReservationCreateCommand(
                        actorCenterId,
                        member.memberId(),
                        membership.membershipId(),
                        schedule.scheduleId(),
                        ReservationStatus.CONFIRMED.name(),
                        now,
                        trimToNull(request.memo()),
                        actorUserId
                ));
            } catch (DataAccessException ex) {
                throw mapCreateDataAccessException(ex);
            }
        });
    }

    @Transactional(readOnly = true)
    public List<Reservation> list(Long memberId, Long scheduleId, String status) {
        Long actorCenterId = currentUserProvider.currentCenterId();
        Long trainerScopedUserId = resolveTrainerScopedActorId();
        String normalizedStatus = status == null || status.isBlank() ? null : status.trim().toUpperCase();
        if (normalizedStatus != null) {
            try {
                ReservationStatus.valueOf(normalizedStatus);
            } catch (IllegalArgumentException ex) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "status filter is invalid");
            }
        }
        return reservationRepository.findAll(actorCenterId, memberId, scheduleId, normalizedStatus, trainerScopedUserId);
    }

    @Transactional(readOnly = true)
    public List<ReservationTarget> listTargets(String keyword) {
        return reservationQueryRepository.findReservationTargets(
                        currentUserProvider.currentCenterId(),
                        keyword,
                        resolveTrainerScopedActorId(),
                        LocalDate.now(BUSINESS_ZONE)
                ).stream()
                .map(target -> new ReservationTarget(
                        target.memberId(),
                        target.memberCode(),
                        target.memberName(),
                        target.phone(),
                        target.reservableMembershipCount(),
                        target.membershipExpiryDate(),
                        target.confirmedReservationCount()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public Reservation get(Long reservationId) {
        if (reservationId == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "reservationId is required");
        }
        return getReservation(reservationId);
    }

    @Transactional(readOnly = true)
    public List<TrainerSchedule> listSchedules() {
        return trainerScheduleRepository.findAll(currentUserProvider.currentCenterId());
    }

    @Transactional
    public Reservation cancel(CancelRequest request) {
        if (request.reservationId() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "reservationId is required");
        }

        Long actorUserId = currentUserProvider.currentUserId();
        Reservation reservation = getReservation(request.reservationId());

        return reservationLockService.execute(reservation.centerId(), reservation.scheduleId(), () -> {
            Reservation lockedReservation = getReservation(request.reservationId());
            reservationStatusTransitionService.assertTransitionAllowed(
                    ReservationStatus.valueOf(lockedReservation.reservationStatus()),
                    ReservationStatus.CANCELLED
            );

            OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
            Reservation updated = reservationRepository.markCancelledIfCurrent(new ReservationRepository.ReservationCancelCommand(
                    lockedReservation.reservationId(),
                    lockedReservation.centerId(),
                    lockedReservation.reservationStatus(),
                    now,
                    trimToNull(request.cancelReason()),
                    actorUserId
            )).orElseThrow(() -> new ApiException(ErrorCode.CONFLICT, "예약 상태가 변경되어 취소를 처리할 수 없습니다."));

            trainerScheduleRepository.decrementCurrentCountIfPositive(lockedReservation.scheduleId(), actorUserId)
                    .orElseThrow(() -> new ApiException(ErrorCode.CONFLICT, "스케줄 정원 카운트 상태가 일치하지 않습니다."));

            return updated;
        });
    }

    @Transactional
    public CompleteResult complete(CompleteRequest request) {
        if (request.reservationId() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "reservationId is required");
        }

        Long actorUserId = currentUserProvider.currentUserId();
        Reservation reservation = getReservation(request.reservationId());

        return reservationLockService.execute(reservation.centerId(), reservation.scheduleId(), () -> {
            Reservation lockedReservation = getReservation(request.reservationId());
            reservationStatusTransitionService.assertTransitionAllowed(
                    ReservationStatus.valueOf(lockedReservation.reservationStatus()),
                    ReservationStatus.COMPLETED
            );

            MemberMembership membership = getMembership(lockedReservation.membershipId());
            validateReservationMembershipConsistency(lockedReservation, membership);

            OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
            Reservation updatedReservation = reservationRepository.markCompletedIfCurrent(new ReservationRepository.ReservationCompleteCommand(
                    lockedReservation.reservationId(),
                    lockedReservation.centerId(),
                    lockedReservation.reservationStatus(),
                    now,
                    actorUserId
            )).orElseThrow(() -> new ApiException(ErrorCode.CONFLICT, "예약 상태가 변경되어 완료를 처리할 수 없습니다."));

            trainerScheduleRepository.decrementCurrentCountIfPositive(lockedReservation.scheduleId(), actorUserId)
                    .orElseThrow(() -> new ApiException(ErrorCode.CONFLICT, "스케줄 정원 카운트 상태가 일치하지 않습니다."));

            MemberMembership updatedMembership = membership;
            boolean countDeducted = false;
            if ("COUNT".equals(membership.productTypeSnapshot())) {
                updatedMembership = memberMembershipRepository.consumeOneCountIfEligible(membership.membershipId(), actorUserId)
                        .orElseThrow(() -> new ApiException(ErrorCode.CONFLICT, "차감 가능한 횟수제 회원권이 없습니다."));
                membershipUsageEventRepository.insert(new MembershipUsageEventRepository.InsertCommand(
                        lockedReservation.centerId(),
                        membership.membershipId(),
                        lockedReservation.reservationId(),
                        "RESERVATION_COMPLETE",
                        -1,
                        now,
                        actorUserId,
                        "예약 완료에 따른 횟수 차감"
                ));
                countDeducted = true;
            }

            return new CompleteResult(updatedReservation, updatedMembership, countDeducted);
        });
    }

    @Transactional
    public Reservation checkIn(CheckInRequest request) {
        if (request.reservationId() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "reservationId is required");
        }

        Reservation reservation = getReservation(request.reservationId());
        ReservationStatus currentStatus = ReservationStatus.valueOf(reservation.reservationStatus());
        if (currentStatus != ReservationStatus.CONFIRMED) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "CONFIRMED 상태 예약만 체크인할 수 있습니다.");
        }
        if (reservation.checkedInAt() != null) {
            throw new ApiException(ErrorCode.CONFLICT, "이미 체크인 처리된 예약입니다.");
        }

        Long actorUserId = currentUserProvider.currentUserId();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        return reservationRepository.markCheckedInIfEligible(new ReservationRepository.ReservationCheckInCommand(
                reservation.reservationId(),
                reservation.centerId(),
                reservation.reservationStatus(),
                now,
                actorUserId
        )).orElseThrow(() -> new ApiException(ErrorCode.CONFLICT, "예약 상태가 변경되었거나 이미 체크인 처리되었습니다."));
    }

    @Transactional
    public Reservation noShow(NoShowRequest request) {
        if (request.reservationId() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "reservationId is required");
        }

        Long actorUserId = currentUserProvider.currentUserId();
        Reservation reservation = getReservation(request.reservationId());

        return reservationLockService.execute(reservation.centerId(), reservation.scheduleId(), () -> {
            Reservation lockedReservation = getReservation(request.reservationId());
            reservationStatusTransitionService.assertTransitionAllowed(
                    ReservationStatus.valueOf(lockedReservation.reservationStatus()),
                    ReservationStatus.NO_SHOW
            );
            if (lockedReservation.checkedInAt() != null) {
                throw new ApiException(ErrorCode.BUSINESS_RULE, "체크인된 예약은 노쇼 처리할 수 없습니다.");
            }

            TrainerSchedule schedule = getSchedule(lockedReservation.scheduleId());
            OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
            if (schedule.endAt() == null || now.isBefore(schedule.endAt())) {
                throw new ApiException(ErrorCode.BUSINESS_RULE, "노쇼 처리는 수업 종료 시간 이후에만 가능합니다.");
            }

            Reservation updated = reservationRepository.markNoShowIfCurrent(new ReservationRepository.ReservationNoShowCommand(
                    lockedReservation.reservationId(),
                    lockedReservation.centerId(),
                    lockedReservation.reservationStatus(),
                    now,
                    actorUserId
            )).orElseThrow(() -> new ApiException(ErrorCode.CONFLICT, "예약 상태가 변경되어 노쇼 처리를 할 수 없습니다."));

            trainerScheduleRepository.decrementCurrentCountIfPositive(lockedReservation.scheduleId(), actorUserId)
                    .orElseThrow(() -> new ApiException(ErrorCode.CONFLICT, "스케줄 정원 카운트 상태가 일치하지 않습니다."));

            return updated;
        });
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
            throw new ApiException(ErrorCode.BUSINESS_RULE, "비활성 회원은 예약할 수 없습니다.");
        }
        if (!member.centerId().equals(actorCenterId)) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "현재 사용자 센터에서만 예약을 생성할 수 있습니다.");
        }
        if (!member.memberId().equals(membership.memberId())) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "회원과 회원권이 일치하지 않습니다.");
        }
        if (!member.centerId().equals(membership.centerId()) || !member.centerId().equals(schedule.centerId())) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "센터 정보가 일치하지 않습니다.");
        }
        if (!"ACTIVE".equals(membership.membershipStatus())) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "ACTIVE 상태 회원권만 예약에 사용할 수 있습니다.");
        }
        LocalDate businessDate = LocalDate.now(BUSINESS_ZONE);
        if (membership.endDate() != null && membership.endDate().isBefore(businessDate)) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "만료된 회원권은 예약에 사용할 수 없습니다.");
        }
        if ("COUNT".equals(membership.productTypeSnapshot()) && (membership.remainingCount() == null || membership.remainingCount() <= 0)) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "잔여 횟수가 없는 횟수제 회원권은 예약에 사용할 수 없습니다.");
        }

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (!schedule.startAt().atZoneSameInstant(BUSINESS_ZONE).isAfter(now.atZoneSameInstant(BUSINESS_ZONE))) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "과거 슬롯은 예약할 수 없습니다.");
        }
    }

    private void validateReservationMembershipConsistency(Reservation reservation, MemberMembership membership) {
        if (!reservation.membershipId().equals(membership.membershipId())
                || !reservation.memberId().equals(membership.memberId())
                || !reservation.centerId().equals(membership.centerId())) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "예약과 회원권 정보가 일치하지 않습니다.");
        }
        if (!"ACTIVE".equals(membership.membershipStatus())) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "ACTIVE 상태 회원권만 예약 완료 처리할 수 있습니다.");
        }
    }

    private Reservation getReservation(Long reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId, currentUserProvider.currentCenterId())
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "예약을 찾을 수 없습니다. reservationId=" + reservationId));
        guardTrainerMembershipAccess(getMembership(reservation.membershipId()));
        return reservation;
    }

    private MemberMembership getMembership(Long membershipId) {
        return memberMembershipRepository.findById(membershipId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "회원권을 찾을 수 없습니다. membershipId=" + membershipId));
    }

    private TrainerSchedule getSchedule(Long scheduleId) {
        return trainerScheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "스케줄을 찾을 수 없습니다. scheduleId=" + scheduleId));
    }

    private void guardTrainerMembershipAccess(MemberMembership membership) {
        Long trainerScopedUserId = resolveTrainerScopedActorId();
        if (trainerScopedUserId == null) {
            return;
        }
        if (!trainerScopedUserId.equals(membership.assignedTrainerId())) {
            throw new ApiException(ErrorCode.ACCESS_DENIED, "트레이너는 본인 담당 회원권 예약만 처리할 수 있습니다.");
        }
    }

    private Long resolveTrainerScopedActorId() {
        AuthUser actor = currentActorOrNull();
        if (actor == null || !"ROLE_TRAINER".equals(actor.roleCode())) {
            return null;
        }
        return actor.userId();
    }

    private AuthUser currentActorOrNull() {
        try {
            return authUserRepository.findActiveById(currentUserProvider.currentUserId()).orElse(null);
        } catch (IllegalStateException ex) {
            return null;
        }
    }

    private ApiException mapCreateDataAccessException(DataAccessException ex) {
        String message = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        if (message != null && message.contains("uk_reservations_member_schedule_confirmed")) {
            return new ApiException(ErrorCode.CONFLICT, "동일 회원의 동일 슬롯 중복 예약은 허용되지 않습니다.");
        }
        return new ApiException(ErrorCode.INTERNAL_ERROR, "예약 생성 처리 중 데이터 오류가 발생했습니다.");
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public record CreateRequest(Long memberId, Long membershipId, Long scheduleId, String memo) {}

    public record CancelRequest(Long reservationId, String cancelReason) {}

    public record CompleteRequest(Long reservationId) {}

    public record CheckInRequest(Long reservationId) {}

    public record NoShowRequest(Long reservationId) {}

    public record CompleteResult(Reservation reservation, MemberMembership membership, boolean countDeducted) {}

    public record ReservationTarget(
            Long memberId,
            String memberCode,
            String memberName,
            String phone,
            Integer reservableMembershipCount,
            LocalDate membershipExpiryDate,
            Integer confirmedReservationCount
    ) {}
}
