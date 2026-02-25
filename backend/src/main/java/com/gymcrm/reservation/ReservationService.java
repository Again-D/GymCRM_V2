package com.gymcrm.reservation;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.member.Member;
import com.gymcrm.member.MemberService;
import com.gymcrm.membership.MemberMembership;
import com.gymcrm.membership.MemberMembershipRepository;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;

@Service
public class ReservationService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Seoul");
    private static final long DEFAULT_CENTER_ID = 1L;

    private final MemberService memberService;
    private final MemberMembershipRepository memberMembershipRepository;
    private final TrainerScheduleRepository trainerScheduleRepository;
    private final ReservationRepository reservationRepository;
    private final ReservationStatusTransitionService reservationStatusTransitionService;
    private final CurrentUserProvider currentUserProvider;

    public ReservationService(
            MemberService memberService,
            MemberMembershipRepository memberMembershipRepository,
            TrainerScheduleRepository trainerScheduleRepository,
            ReservationRepository reservationRepository,
            ReservationStatusTransitionService reservationStatusTransitionService,
            CurrentUserProvider currentUserProvider
    ) {
        this.memberService = memberService;
        this.memberMembershipRepository = memberMembershipRepository;
        this.trainerScheduleRepository = trainerScheduleRepository;
        this.reservationRepository = reservationRepository;
        this.reservationStatusTransitionService = reservationStatusTransitionService;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional
    public Reservation create(CreateRequest request) {
        validateCreateRequest(request);

        Member member = memberService.get(request.memberId());
        MemberMembership membership = getMembership(request.membershipId());
        TrainerSchedule schedule = getSchedule(request.scheduleId());
        validateCreateEligibility(member, membership, schedule);
        if (reservationRepository.existsConfirmedByMemberAndSchedule(member.memberId(), schedule.scheduleId())) {
            throw new ApiException(ErrorCode.CONFLICT, "동일 회원의 동일 슬롯 중복 예약은 허용되지 않습니다.");
        }

        Long actorUserId = currentUserProvider.currentUserId();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        try {
            TrainerSchedule updatedSchedule = trainerScheduleRepository.incrementCurrentCountIfAvailable(schedule.scheduleId(), actorUserId)
                    .orElseThrow(() -> new ApiException(ErrorCode.CONFLICT, "예약 가능한 정원이 없습니다."));

            if (updatedSchedule.currentCount() == null || updatedSchedule.capacity() == null
                    || updatedSchedule.currentCount() > updatedSchedule.capacity()) {
                throw new ApiException(ErrorCode.CONFLICT, "예약 가능한 정원이 없습니다.");
            }

            return reservationRepository.insert(new ReservationRepository.ReservationCreateCommand(
                    member.centerId(),
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
    }

    @Transactional(readOnly = true)
    public List<Reservation> list(Long memberId, Long scheduleId, String status) {
        String normalizedStatus = status == null || status.isBlank() ? null : status.trim().toUpperCase();
        if (normalizedStatus != null) {
            try {
                ReservationStatus.valueOf(normalizedStatus);
            } catch (IllegalArgumentException ex) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "status filter is invalid");
            }
        }
        return reservationRepository.findAll(DEFAULT_CENTER_ID, memberId, scheduleId, normalizedStatus);
    }

    @Transactional(readOnly = true)
    public Reservation get(Long reservationId) {
        if (reservationId == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "reservationId is required");
        }
        return getReservation(reservationId);
    }

    @Transactional
    public Reservation cancel(CancelRequest request) {
        if (request.reservationId() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "reservationId is required");
        }

        Reservation reservation = getReservation(request.reservationId());
        reservationStatusTransitionService.assertTransitionAllowed(
                ReservationStatus.valueOf(reservation.reservationStatus()),
                ReservationStatus.CANCELLED
        );

        Long actorUserId = currentUserProvider.currentUserId();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        Reservation updated = reservationRepository.markCancelledIfCurrent(new ReservationRepository.ReservationCancelCommand(
                reservation.reservationId(),
                reservation.reservationStatus(),
                now,
                trimToNull(request.cancelReason()),
                actorUserId
        )).orElseThrow(() -> new ApiException(ErrorCode.CONFLICT, "예약 상태가 변경되어 취소를 처리할 수 없습니다."));

        trainerScheduleRepository.decrementCurrentCountIfPositive(reservation.scheduleId(), actorUserId)
                .orElseThrow(() -> new ApiException(ErrorCode.CONFLICT, "스케줄 정원 카운트 상태가 일치하지 않습니다."));

        return updated;
    }

    @Transactional
    public CompleteResult complete(CompleteRequest request) {
        if (request.reservationId() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "reservationId is required");
        }

        Reservation reservation = getReservation(request.reservationId());
        reservationStatusTransitionService.assertTransitionAllowed(
                ReservationStatus.valueOf(reservation.reservationStatus()),
                ReservationStatus.COMPLETED
        );

        MemberMembership membership = getMembership(reservation.membershipId());
        validateReservationMembershipConsistency(reservation, membership);

        Long actorUserId = currentUserProvider.currentUserId();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        Reservation updatedReservation = reservationRepository.markCompletedIfCurrent(new ReservationRepository.ReservationCompleteCommand(
                reservation.reservationId(),
                reservation.reservationStatus(),
                now,
                actorUserId
        )).orElseThrow(() -> new ApiException(ErrorCode.CONFLICT, "예약 상태가 변경되어 완료를 처리할 수 없습니다."));

        trainerScheduleRepository.decrementCurrentCountIfPositive(reservation.scheduleId(), actorUserId)
                .orElseThrow(() -> new ApiException(ErrorCode.CONFLICT, "스케줄 정원 카운트 상태가 일치하지 않습니다."));

        MemberMembership updatedMembership = membership;
        boolean countDeducted = false;
        if ("COUNT".equals(membership.productTypeSnapshot())) {
            updatedMembership = memberMembershipRepository.consumeOneCountIfEligible(membership.membershipId(), actorUserId)
                    .orElseThrow(() -> new ApiException(ErrorCode.CONFLICT, "차감 가능한 횟수제 회원권이 없습니다."));
            countDeducted = true;
        }

        return new CompleteResult(updatedReservation, updatedMembership, countDeducted);
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

    private void validateCreateEligibility(Member member, MemberMembership membership, TrainerSchedule schedule) {
        if (!"ACTIVE".equals(member.memberStatus())) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "비활성 회원은 예약할 수 없습니다.");
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
        return reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "예약을 찾을 수 없습니다. reservationId=" + reservationId));
    }

    private MemberMembership getMembership(Long membershipId) {
        return memberMembershipRepository.findById(membershipId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "회원권을 찾을 수 없습니다. membershipId=" + membershipId));
    }

    private TrainerSchedule getSchedule(Long scheduleId) {
        return trainerScheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "스케줄을 찾을 수 없습니다. scheduleId=" + scheduleId));
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

    public record CompleteResult(Reservation reservation, MemberMembership membership, boolean countDeducted) {}
}
