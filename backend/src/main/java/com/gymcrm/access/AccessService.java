package com.gymcrm.access;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.member.Member;
import com.gymcrm.member.MemberRepository;
import com.gymcrm.reservation.Reservation;
import com.gymcrm.reservation.ReservationRepository;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service
public class AccessService {
    private static final int EVENT_LIMIT_MAX = 200;
    private static final int PRESENCE_LIST_LIMIT = 100;

    private final AccessEventRepository accessEventRepository;
    private final MemberAccessSessionRepository memberAccessSessionRepository;
    private final AccessEligibilityService accessEligibilityService;
    private final MemberRepository memberRepository;
    private final ReservationRepository reservationRepository;
    private final CurrentUserProvider currentUserProvider;

    public AccessService(
            AccessEventRepository accessEventRepository,
            MemberAccessSessionRepository memberAccessSessionRepository,
            AccessEligibilityService accessEligibilityService,
            MemberRepository memberRepository,
            ReservationRepository reservationRepository,
            CurrentUserProvider currentUserProvider
    ) {
        this.accessEventRepository = accessEventRepository;
        this.memberAccessSessionRepository = memberAccessSessionRepository;
        this.accessEligibilityService = accessEligibilityService;
        this.memberRepository = memberRepository;
        this.reservationRepository = reservationRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional(noRollbackFor = AccessDeniedApiException.class)
    public AccessEvent enter(EnterRequest request) {
        if (request.memberId() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "memberId is required");
        }

        Long centerId = currentUserProvider.currentCenterId();
        Long actorUserId = currentUserProvider.currentUserId();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        Member member = getMemberInCenter(request.memberId(), centerId);
        validateReservationIfPresent(centerId, member.memberId(), request.reservationId());

        if (!"ACTIVE".equals(member.memberStatus())) {
            return denyAndThrow(centerId, actorUserId, member.memberId(), request.membershipId(), request.reservationId(),
                    "MEMBER_INACTIVE", "ACTIVE 회원만 입장 처리할 수 있습니다.", now);
        }

        if (memberAccessSessionRepository.findOpenByMember(centerId, member.memberId()).isPresent()) {
            return denyAndThrow(centerId, actorUserId, member.memberId(), request.membershipId(), request.reservationId(),
                    "ALREADY_ENTERED", "이미 입장 처리된 회원입니다.", now);
        }

        Long eligibleMembershipId = accessEligibilityService
                .resolveEligibleMembershipId(centerId, member.memberId(), request.membershipId())
                .orElse(null);
        if (eligibleMembershipId == null) {
            return denyAndThrow(centerId, actorUserId, member.memberId(), request.membershipId(), request.reservationId(),
                    "MEMBERSHIP_INELIGIBLE", "입장 가능한 ACTIVE 회원권이 없습니다.", now);
        }

        AccessEvent grantedEvent = accessEventRepository.insert(new AccessEventRepository.InsertCommand(
                centerId,
                member.memberId(),
                eligibleMembershipId,
                request.reservationId(),
                actorUserId,
                "ENTRY_GRANTED",
                null,
                now
        ));

        try {
            memberAccessSessionRepository.insertOpen(new MemberAccessSessionRepository.InsertOpenCommand(
                    centerId,
                    member.memberId(),
                    eligibleMembershipId,
                    request.reservationId(),
                    grantedEvent.accessEventId(),
                    now
            ));
        } catch (DataAccessException ex) {
            throw mapSessionWriteError(ex);
        }

        return grantedEvent;
    }

    @Transactional
    public AccessEvent exit(ExitRequest request) {
        if (request.memberId() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "memberId is required");
        }

        Long centerId = currentUserProvider.currentCenterId();
        Long actorUserId = currentUserProvider.currentUserId();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        Member member = getMemberInCenter(request.memberId(), centerId);
        MemberAccessSession openSession = memberAccessSessionRepository.findOpenByMember(centerId, member.memberId())
                .orElseThrow(() -> new ApiException(ErrorCode.BUSINESS_RULE, "입장중 상태가 없어 퇴장 처리할 수 없습니다."));

        AccessEvent exitEvent = accessEventRepository.insert(new AccessEventRepository.InsertCommand(
                centerId,
                member.memberId(),
                openSession.membershipId(),
                openSession.reservationId(),
                actorUserId,
                "EXIT",
                null,
                now
        ));

        memberAccessSessionRepository.closeSession(new MemberAccessSessionRepository.CloseCommand(
                        openSession.accessSessionId(),
                        exitEvent.accessEventId(),
                        now
                ))
                .orElseThrow(() -> new ApiException(ErrorCode.CONFLICT, "이미 퇴장 처리되었거나 세션 상태가 변경되었습니다."));

        return exitEvent;
    }

    @Transactional(readOnly = true)
    public List<AccessEvent> listEvents(Long memberId, String eventType, Integer limit) {
        Long centerId = currentUserProvider.currentCenterId();
        String normalizedType = normalizeEventType(eventType);
        int boundedLimit = limit == null ? 50 : Math.min(Math.max(limit, 1), EVENT_LIMIT_MAX);
        return accessEventRepository.findAll(centerId, memberId, normalizedType, boundedLimit);
    }

    @Transactional(readOnly = true)
    public PresenceSummary getPresence() {
        Long centerId = currentUserProvider.currentCenterId();
        return new PresenceSummary(
                memberAccessSessionRepository.countOpenSessions(centerId),
                accessEventRepository.countTodayByType(centerId, "ENTRY_GRANTED"),
                accessEventRepository.countTodayByType(centerId, "EXIT"),
                accessEventRepository.countTodayByType(centerId, "ENTRY_DENIED"),
                memberAccessSessionRepository.findOpenSessions(centerId, PRESENCE_LIST_LIMIT)
        );
    }

    private AccessEvent denyAndThrow(
            Long centerId,
            Long actorUserId,
            Long memberId,
            Long membershipId,
            Long reservationId,
            String denyReason,
            String message,
            OffsetDateTime now
    ) {
        accessEventRepository.insert(new AccessEventRepository.InsertCommand(
                centerId,
                memberId,
                membershipId,
                reservationId,
                actorUserId,
                "ENTRY_DENIED",
                denyReason,
                now
        ));
        throw new AccessDeniedApiException(message);
    }

    private void validateReservationIfPresent(Long centerId, Long memberId, Long reservationId) {
        if (reservationId == null) {
            return;
        }
        Reservation reservation = reservationRepository.findById(reservationId, centerId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "예약을 찾을 수 없습니다. reservationId=" + reservationId));
        if (!memberId.equals(reservation.memberId())) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "예약 회원과 출입 대상 회원이 일치하지 않습니다.");
        }
    }

    private Member getMemberInCenter(Long memberId, Long centerId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "회원을 찾을 수 없습니다. memberId=" + memberId));
        if (!centerId.equals(member.centerId())) {
            throw new ApiException(ErrorCode.NOT_FOUND, "회원을 찾을 수 없습니다. memberId=" + memberId);
        }
        return member;
    }

    private String normalizeEventType(String eventType) {
        if (eventType == null || eventType.isBlank()) {
            return null;
        }
        String normalized = eventType.trim().toUpperCase();
        if (!"ENTRY_GRANTED".equals(normalized) && !"EXIT".equals(normalized) && !"ENTRY_DENIED".equals(normalized)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "eventType filter is invalid");
        }
        return normalized;
    }

    private ApiException mapSessionWriteError(DataAccessException ex) {
        String message = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        if (message != null && message.contains("uk_member_access_sessions_open_per_member")) {
            return new ApiException(ErrorCode.CONFLICT, "이미 입장 처리된 회원입니다.");
        }
        return new ApiException(ErrorCode.INTERNAL_ERROR, "출입 세션 처리 중 오류가 발생했습니다.");
    }

    public record EnterRequest(Long memberId, Long membershipId, Long reservationId) {}

    public record ExitRequest(Long memberId) {}

    public record PresenceSummary(
            int openSessionCount,
            int todayEntryGrantedCount,
            int todayExitCount,
            int todayEntryDeniedCount,
            List<MemberAccessSession> openSessions
    ) {}
}
