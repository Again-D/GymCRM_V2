package com.gymcrm.reservation.service;

import com.gymcrm.common.auth.entity.AuthUser;
import com.gymcrm.common.auth.repository.AuthUserRepository;
import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.member.entity.Member;
import com.gymcrm.member.enums.MemberStatus;
import com.gymcrm.member.service.MemberService;
import com.gymcrm.membership.entity.MemberMembership;
import com.gymcrm.membership.repository.MemberMembershipRepository;
import com.gymcrm.reservation.entity.Reservation;
import com.gymcrm.reservation.repository.ReservationQueryRepository;
import com.gymcrm.reservation.repository.ReservationRepository;
import com.gymcrm.reservation.repository.TrainerScheduleQueryRepository;
import com.gymcrm.reservation.repository.TrainerScheduleRepository;
import com.gymcrm.trainer.availability.entity.TrainerAvailabilityEffectiveDay;
import com.gymcrm.trainer.availability.entity.TrainerAvailabilityException;
import com.gymcrm.trainer.availability.entity.TrainerAvailabilityRule;
import com.gymcrm.trainer.availability.enums.TrainerAvailabilityExceptionType;
import com.gymcrm.trainer.availability.repository.TrainerAvailabilityRepository;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class PtReservationService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Seoul");
    private static final int SLOT_DURATION_MINUTES = 60;
    private static final int SLOT_STEP_MINUTES = 30;
    private static final int MAX_MEMO_LENGTH = 500;
    private static final String ROLE_TRAINER = "ROLE_TRAINER";
    private static final String ROLE_SUPER_ADMIN = "ROLE_SUPER_ADMIN";
    private static final String ROLE_CENTER_ADMIN = "ROLE_CENTER_ADMIN";
    private static final String ROLE_MANAGER = "ROLE_MANAGER";
    private static final String ROLE_DESK = "ROLE_DESK";

    private final AuthUserRepository authUserRepository;
    private final CurrentUserProvider currentUserProvider;
    private final MemberMembershipRepository memberMembershipRepository;
    private final MemberService memberService;
    private final TrainerAvailabilityRepository trainerAvailabilityRepository;
    private final TrainerScheduleQueryRepository trainerScheduleQueryRepository;
    private final TrainerScheduleRepository trainerScheduleRepository;
    private final ReservationQueryRepository reservationQueryRepository;
    private final ReservationRepository reservationRepository;
    private final JdbcClient jdbcClient;

    public PtReservationService(
            AuthUserRepository authUserRepository,
            CurrentUserProvider currentUserProvider,
            MemberMembershipRepository memberMembershipRepository,
            MemberService memberService,
            TrainerAvailabilityRepository trainerAvailabilityRepository,
            TrainerScheduleQueryRepository trainerScheduleQueryRepository,
            TrainerScheduleRepository trainerScheduleRepository,
            ReservationQueryRepository reservationQueryRepository,
            ReservationRepository reservationRepository,
            JdbcClient jdbcClient
    ) {
        this.authUserRepository = authUserRepository;
        this.currentUserProvider = currentUserProvider;
        this.memberMembershipRepository = memberMembershipRepository;
        this.memberService = memberService;
        this.trainerAvailabilityRepository = trainerAvailabilityRepository;
        this.trainerScheduleQueryRepository = trainerScheduleQueryRepository;
        this.trainerScheduleRepository = trainerScheduleRepository;
        this.reservationQueryRepository = reservationQueryRepository;
        this.reservationRepository = reservationRepository;
        this.jdbcClient = jdbcClient;
    }

    @Transactional(readOnly = true)
    public PtReservationCandidates listCandidates(Long membershipId, Long trainerUserId, String dateText) {
        AuthUser actor = requireActor();
        LocalDate date = parseDate(dateText);
        MemberMembership membership = requireMembershipInActorCenter(membershipId, actor.centerId());
        AuthUser trainer = requireScopedTrainer(actor, trainerUserId, membership);
        validatePtMembershipEligibility(membership, actor.centerId(), false);

        TrainerAvailabilityEffectiveDay effectiveDay = resolveEffectiveDay(actor.centerId(), trainer.userId(), date);
        if (!"AVAILABLE".equals(effectiveDay.availabilityStatus())
                || effectiveDay.startTime() == null
                || effectiveDay.endTime() == null) {
            return new PtReservationCandidates(date, trainer.userId(), membership.membershipId(), SLOT_DURATION_MINUTES, SLOT_STEP_MINUTES, List.of());
        }

        OffsetDateTime dayStart = toBusinessOffsetDateTime(date, LocalTime.MIN);
        OffsetDateTime dayEnd = toBusinessOffsetDateTime(date.plusDays(1), LocalTime.MIN);
        List<TrainerScheduleQueryRepository.TimeBlock> trainerBlocks = trainerScheduleQueryRepository.findTimeBlocksByTrainerAndRange(
                actor.centerId(),
                trainer.userId(),
                dayStart,
                dayEnd
        );
        List<ReservationQueryRepository.TimeBlock> memberBlocks = reservationQueryRepository.findConfirmedTimeBlocksByMemberAndRange(
                actor.centerId(),
                membership.memberId(),
                dayStart,
                dayEnd
        );

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        List<PtReservationCandidate> items = new ArrayList<>();
        for (LocalTime cursor = effectiveDay.startTime();
             !cursor.plusMinutes(SLOT_DURATION_MINUTES).isAfter(effectiveDay.endTime());
             cursor = cursor.plusMinutes(SLOT_STEP_MINUTES)) {
            OffsetDateTime startAt = toBusinessOffsetDateTime(date, cursor);
            OffsetDateTime endAt = startAt.plusMinutes(SLOT_DURATION_MINUTES);
            if (!startAt.isAfter(now)) {
                continue;
            }
            if (overlapsTrainer(trainerBlocks, startAt, endAt) || overlapsMember(memberBlocks, startAt, endAt)) {
                continue;
            }
            items.add(new PtReservationCandidate(startAt, endAt, effectiveDay.source()));
        }

        return new PtReservationCandidates(
                date,
                trainer.userId(),
                membership.membershipId(),
                SLOT_DURATION_MINUTES,
                SLOT_STEP_MINUTES,
                items.stream().sorted(Comparator.comparing(PtReservationCandidate::startAt)).toList()
        );
    }

    @Transactional
    public Reservation create(CreatePtReservationRequest request) {
        AuthUser actor = requireActor();
        OffsetDateTime startAt = parseStartAt(request.startAt());
        validateStartAt(startAt);
        OffsetDateTime endAt = startAt.plusMinutes(SLOT_DURATION_MINUTES);

        MemberMembership membership = requireMembershipInActorCenter(request.membershipId(), actor.centerId());
        if (!membership.memberId().equals(request.memberId())) {
            throw new ApiException(ErrorCode.NOT_FOUND, "회원권을 찾을 수 없습니다. membershipId=" + request.membershipId());
        }
        AuthUser trainer = requireScopedTrainer(actor, request.trainerUserId(), membership);
        Member member = memberService.get(request.memberId());
        validateMember(member, actor.centerId());

        memberMembershipRepository.findByIdForUpdate(membership.membershipId())
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "회원권을 찾을 수 없습니다. membershipId=" + membership.membershipId()));
        acquireTransactionLock(actor.centerId(), trainer.userId(), startAt);

        MemberMembership lockedMembership = requireMembershipInActorCenter(membership.membershipId(), actor.centerId());
        validatePtMembershipEligibility(lockedMembership, actor.centerId(), true);
        ensureWithinAvailability(actor.centerId(), trainer.userId(), startAt, endAt);
        ensureNoOverlap(actor.centerId(), trainer.userId(), member.memberId(), startAt, endAt);

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        String memo = normalizeMemo(request.memo());
        var schedule = trainerScheduleRepository.insert(new TrainerScheduleRepository.TrainerScheduleCreateCommand(
                actor.centerId(),
                trainer.userId(),
                "PT",
                trainer.userName(),
                "PT 예약",
                startAt,
                endAt,
                1,
                1,
                memo,
                actor.userId(),
                null,
                null
        ));
        return reservationRepository.insert(new ReservationRepository.ReservationCreateCommand(
                actor.centerId(),
                member.memberId(),
                lockedMembership.membershipId(),
                schedule.scheduleId(),
                "CONFIRMED",
                now,
                memo,
                actor.userId()
        ));
    }

    private void ensureNoOverlap(Long centerId, Long trainerUserId, Long memberId, OffsetDateTime startAt, OffsetDateTime endAt) {
        if (overlapsTrainer(
                trainerScheduleQueryRepository.findTimeBlocksByTrainerAndRange(centerId, trainerUserId, startAt, endAt),
                startAt,
                endAt
        )) {
            throw new ApiException(ErrorCode.CONFLICT, "트레이너 시간이 겹치는 예약이 이미 존재합니다.");
        }
        if (overlapsMember(
                reservationQueryRepository.findConfirmedTimeBlocksByMemberAndRange(centerId, memberId, startAt, endAt),
                startAt,
                endAt
        )) {
            throw new ApiException(ErrorCode.CONFLICT, "회원의 다른 예약과 시간이 겹칩니다.");
        }
    }

    private boolean overlapsTrainer(List<TrainerScheduleQueryRepository.TimeBlock> blocks, OffsetDateTime startAt, OffsetDateTime endAt) {
        return blocks.stream().anyMatch(block -> overlaps(startAt, endAt, block.startAt(), block.endAt()));
    }

    private boolean overlapsMember(List<ReservationQueryRepository.TimeBlock> blocks, OffsetDateTime startAt, OffsetDateTime endAt) {
        return blocks.stream().anyMatch(block -> overlaps(startAt, endAt, block.startAt(), block.endAt()));
    }

    private boolean overlaps(OffsetDateTime startAt, OffsetDateTime endAt, OffsetDateTime otherStartAt, OffsetDateTime otherEndAt) {
        return startAt.isBefore(otherEndAt) && endAt.isAfter(otherStartAt);
    }

    private void ensureWithinAvailability(Long centerId, Long trainerUserId, OffsetDateTime startAt, OffsetDateTime endAt) {
        LocalDate date = startAt.atZoneSameInstant(BUSINESS_ZONE).toLocalDate();
        TrainerAvailabilityEffectiveDay effectiveDay = resolveEffectiveDay(centerId, trainerUserId, date);
        if (!"AVAILABLE".equals(effectiveDay.availabilityStatus())
                || effectiveDay.startTime() == null
                || effectiveDay.endTime() == null) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "트레이너 가능 시간 밖에서는 PT 예약을 생성할 수 없습니다.");
        }
        OffsetDateTime allowedStart = toBusinessOffsetDateTime(date, effectiveDay.startTime());
        OffsetDateTime allowedEnd = toBusinessOffsetDateTime(date, effectiveDay.endTime());
        if (startAt.isBefore(allowedStart) || endAt.isAfter(allowedEnd)) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "트레이너 가능 시간 밖에서는 PT 예약을 생성할 수 없습니다.");
        }
    }

    private TrainerAvailabilityEffectiveDay resolveEffectiveDay(Long centerId, Long trainerUserId, LocalDate date) {
        List<TrainerAvailabilityException> exceptions = trainerAvailabilityRepository.findExceptionsInMonth(
                centerId,
                trainerUserId,
                date,
                date.plusDays(1)
        );
        if (!exceptions.isEmpty()) {
            TrainerAvailabilityException exception = exceptions.getFirst();
            if (TrainerAvailabilityExceptionType.OFF.name().equals(exception.exceptionType())) {
                return new TrainerAvailabilityEffectiveDay(date, "EXCEPTION_OFF", "OFF", null, null, exception.memo());
            }
            return new TrainerAvailabilityEffectiveDay(
                    date,
                    "EXCEPTION_OVERRIDE",
                    "AVAILABLE",
                    exception.overrideStartTime(),
                    exception.overrideEndTime(),
                    exception.memo()
            );
        }

        List<TrainerAvailabilityRule> rules = trainerAvailabilityRepository.findWeeklyRules(centerId, trainerUserId);
        return rules.stream()
                .filter(rule -> rule.dayOfWeek() == dayOfWeekNumber(date.getDayOfWeek()))
                .findFirst()
                .map(rule -> new TrainerAvailabilityEffectiveDay(
                        date,
                        "WEEKLY_RULE",
                        "AVAILABLE",
                        rule.startTime(),
                        rule.endTime(),
                        null
                ))
                .orElseGet(() -> new TrainerAvailabilityEffectiveDay(date, "NONE", "UNSET", null, null, null));
    }

    private void validatePtMembershipEligibility(MemberMembership membership, Long actorCenterId, boolean strictBookableCount) {
        if (!membership.centerId().equals(actorCenterId)) {
            throw new ApiException(ErrorCode.NOT_FOUND, "회원권을 찾을 수 없습니다. membershipId=" + membership.membershipId());
        }
        if (!"ACTIVE".equals(membership.membershipStatus())) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "ACTIVE 상태 회원권만 PT 예약에 사용할 수 있습니다.");
        }
        if (!"PT".equals(membership.productCategorySnapshot()) || !"COUNT".equals(membership.productTypeSnapshot())) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "PT 횟수제 회원권만 PT 예약에 사용할 수 있습니다.");
        }
        LocalDate businessDate = LocalDate.now(BUSINESS_ZONE);
        if (membership.endDate() != null && membership.endDate().isBefore(businessDate)) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "만료된 회원권은 PT 예약에 사용할 수 없습니다.");
        }
        if (membership.remainingCount() == null || membership.remainingCount() <= 0) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "잔여 횟수가 없는 PT 회원권은 예약할 수 없습니다.");
        }
        int outstanding = reservationQueryRepository.countActiveConfirmedPtReservationsForMembership(actorCenterId, membership.membershipId());
        int bookableCount = membership.remainingCount() - outstanding;
        if (bookableCount <= 0 || (strictBookableCount && bookableCount <= 0)) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "잔여 예약 가능 횟수가 없습니다.");
        }
    }

    private void validateMember(Member member, Long actorCenterId) {
        if (!member.centerId().equals(actorCenterId)) {
            throw new ApiException(ErrorCode.NOT_FOUND, "회원을 찾을 수 없습니다. memberId=" + member.memberId());
        }
        if (member.memberStatus() != MemberStatus.ACTIVE) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "비활성 회원은 예약할 수 없습니다.");
        }
    }

    private AuthUser requireScopedTrainer(AuthUser actor, Long trainerUserId, MemberMembership membership) {
        if (trainerUserId == null || trainerUserId <= 0) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "trainerUserId must be positive");
        }
        if (ROLE_TRAINER.equals(actor.roleCode())) {
            if (!actor.userId().equals(trainerUserId) || !actor.userId().equals(membership.assignedTrainerId())) {
                throw new ApiException(ErrorCode.NOT_FOUND, "트레이너를 찾을 수 없습니다. userId=" + trainerUserId);
            }
        }
        AuthUser trainer = authUserRepository.findActiveByCenterAndUserId(actor.centerId(), trainerUserId)
                .filter(AuthUser::isActive)
                .filter(user -> ROLE_TRAINER.equals(user.roleCode()))
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "트레이너를 찾을 수 없습니다. userId=" + trainerUserId));
        return trainer;
    }

    private MemberMembership requireMembershipInActorCenter(Long membershipId, Long actorCenterId) {
        if (membershipId == null || membershipId <= 0) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "membershipId must be positive");
        }
        return memberMembershipRepository.findById(membershipId)
                .filter(membership -> membership.centerId().equals(actorCenterId))
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "회원권을 찾을 수 없습니다. membershipId=" + membershipId));
    }

    private AuthUser requireActor() {
        return authUserRepository.findActiveById(currentUserProvider.currentUserId())
                .filter(AuthUser::isActive)
                .filter(actor -> ROLE_TRAINER.equals(actor.roleCode())
                        || ROLE_SUPER_ADMIN.equals(actor.roleCode())
                        || ROLE_CENTER_ADMIN.equals(actor.roleCode())
                        || ROLE_MANAGER.equals(actor.roleCode())
                        || ROLE_DESK.equals(actor.roleCode()))
                .orElseThrow(() -> new ApiException(ErrorCode.AUTHENTICATION_FAILED, "활성 사용자 정보를 찾을 수 없습니다."));
    }

    private void acquireTransactionLock(Long centerId, Long trainerUserId, OffsetDateTime startAt) {
        String lockKey = "pt:" + centerId + ":" + trainerUserId + ":" + startAt.toEpochSecond();
        jdbcClient.sql("SELECT pg_advisory_xact_lock(hashtext(:lockKey))")
                .param("lockKey", lockKey)
                .query()
                .singleRow();
    }

    private LocalDate parseDate(String text) {
        try {
            return LocalDate.parse(text);
        } catch (DateTimeParseException ex) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "date must be YYYY-MM-DD");
        }
    }

    private OffsetDateTime parseStartAt(String text) {
        try {
            OffsetDateTime parsed = OffsetDateTime.parse(text);
            return parsed.atZoneSameInstant(BUSINESS_ZONE).toOffsetDateTime().withSecond(0).withNano(0);
        } catch (DateTimeParseException ex) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "startAt must be ISO-8601 with offset");
        }
    }

    private void validateStartAt(OffsetDateTime startAt) {
        if (startAt.getMinute() % SLOT_STEP_MINUTES != 0) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "startAt must be on a 30-minute boundary");
        }
        if (!startAt.isAfter(OffsetDateTime.now(ZoneOffset.UTC))) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "과거 시각에는 PT 예약을 생성할 수 없습니다.");
        }
    }

    private String normalizeMemo(String memo) {
        if (memo == null) {
            return null;
        }
        String trimmed = memo.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        if (trimmed.length() > MAX_MEMO_LENGTH) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "memo must be 500 characters or fewer");
        }
        return trimmed;
    }

    private OffsetDateTime toBusinessOffsetDateTime(LocalDate date, LocalTime time) {
        return LocalDateTime.of(date, time).atZone(BUSINESS_ZONE).toOffsetDateTime();
    }

    private int dayOfWeekNumber(DayOfWeek dayOfWeek) {
        return dayOfWeek.getValue();
    }

    public record CreatePtReservationRequest(
            Long memberId,
            Long membershipId,
            Long trainerUserId,
            String startAt,
            String memo
    ) {
    }

    public record PtReservationCandidates(
            LocalDate date,
            Long trainerUserId,
            Long membershipId,
            int slotDurationMinutes,
            int slotStepMinutes,
            List<PtReservationCandidate> items
    ) {
    }

    public record PtReservationCandidate(
            OffsetDateTime startAt,
            OffsetDateTime endAt,
            String source
    ) {
    }
}
