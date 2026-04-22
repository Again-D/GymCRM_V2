package com.gymcrm.locker;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.member.entity.Member;
import com.gymcrm.member.repository.MemberRepository;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class LockerService {
    private final LockerSlotRepository lockerSlotRepository;
    private final LockerAssignmentRepository lockerAssignmentRepository;
    private final MemberRepository memberRepository;
    private final CurrentUserProvider currentUserProvider;

    public LockerService(
            LockerSlotRepository lockerSlotRepository,
            LockerAssignmentRepository lockerAssignmentRepository,
            MemberRepository memberRepository,
            CurrentUserProvider currentUserProvider
    ) {
        this.lockerSlotRepository = lockerSlotRepository;
        this.lockerAssignmentRepository = lockerAssignmentRepository;
        this.memberRepository = memberRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional
    public LockerSlot createSlot(CreateSlotRequest request) {
        return createSlots(List.of(request)).get(0);
    }

    @Transactional
    public List<LockerSlot> createSlots(List<CreateSlotRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "items is required");
        }

        Long centerId = currentUserProvider.currentCenterId();
        Long actorUserId = currentUserProvider.currentUserId();
        Set<String> seenCodes = new HashSet<>();
        List<NormalizedSlotRequest> normalizedRequests = requests.stream()
                .map(this::normalizeCreateSlotRequest)
                .peek(request -> {
                    if (!seenCodes.add(request.lockerCode())) {
                        throw new ApiException(ErrorCode.VALIDATION_ERROR, "duplicate lockerCode in request: " + request.lockerCode());
                    }
                })
                .toList();

        try {
            return normalizedRequests.stream()
                    .map(request -> lockerSlotRepository.insert(new LockerSlotRepository.InsertCommand(
                            centerId,
                            request.lockerCode(),
                            request.lockerZone(),
                            request.lockerGrade(),
                            request.lockerStatus(),
                            request.memo(),
                            actorUserId
                    )))
                    .toList();
        } catch (DataAccessException ex) {
            throw mapSlotWriteError(ex);
        }
    }

    @Transactional(readOnly = true)
    public List<LockerSlot> listSlots(String lockerStatus, String lockerZone) {
        String normalizedStatus = lockerStatus == null ? null : normalizeSlotStatus(lockerStatus);
        String normalizedZone = normalizeLockerZoneOrNull(lockerZone);
        return lockerSlotRepository.findAll(currentUserProvider.currentCenterId(), normalizedStatus, normalizedZone);
    }

    @Transactional(readOnly = true)
    public List<LockerAssignment> listAssignments(boolean activeOnly) {
        return lockerAssignmentRepository.findAll(currentUserProvider.currentCenterId(), activeOnly);
    }

    @Transactional
    public LockerAssignment assign(AssignRequest request) {
        Long centerId = currentUserProvider.currentCenterId();
        Long actorUserId = currentUserProvider.currentUserId();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        if (request.startDate() == null || request.endDate() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "startDate and endDate are required");
        }
        if (request.endDate().isBefore(request.startDate())) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "endDate must be same or after startDate");
        }

        Member member = memberRepository.findById(request.memberId())
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "회원을 찾을 수 없습니다. memberId=" + request.memberId()));
        if (!centerId.equals(member.centerId())) {
            throw new ApiException(ErrorCode.NOT_FOUND, "회원을 찾을 수 없습니다. memberId=" + request.memberId());
        }

        lockerSlotRepository.findById(request.lockerSlotId(), centerId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "라커를 찾을 수 없습니다. lockerSlotId=" + request.lockerSlotId()));

        lockerSlotRepository.markAssignedIfAvailable(new LockerSlotRepository.UpdateStatusCommand(
                        request.lockerSlotId(),
                        centerId,
                        actorUserId,
                        now
                ))
                .orElseThrow(() -> new ApiException(ErrorCode.CONFLICT, "사용 가능한 라커가 아닙니다."));

        try {
            return lockerAssignmentRepository.insertActive(new LockerAssignmentRepository.InsertCommand(
                    centerId,
                    request.lockerSlotId(),
                    request.memberId(),
                    now,
                    request.startDate(),
                    request.endDate(),
                    request.memo(),
                    actorUserId
            ));
        } catch (DataAccessException ex) {
            throw mapAssignmentWriteError(ex);
        }
    }

    @Transactional
    public LockerAssignment returnAssignment(ReturnRequest request) {
        Long centerId = currentUserProvider.currentCenterId();
        Long actorUserId = currentUserProvider.currentUserId();
        OffsetDateTime now = request.returnedAt() == null ? OffsetDateTime.now(ZoneOffset.UTC) : request.returnedAt();

        LockerAssignment closed = lockerAssignmentRepository.closeAssignment(new LockerAssignmentRepository.CloseCommand(
                        request.lockerAssignmentId(),
                        centerId,
                        now,
                        request.refundAmount(),
                        request.returnReason(),
                        request.memo(),
                        actorUserId
                ))
                .orElseThrow(() -> new ApiException(ErrorCode.CONFLICT, "이미 반납 처리되었거나 활성 배정이 아닙니다."));

        lockerSlotRepository.markAvailableIfAssigned(new LockerSlotRepository.UpdateStatusCommand(
                        closed.lockerSlotId(),
                        centerId,
                        actorUserId,
                        now
                ))
                .orElseThrow(() -> new ApiException(ErrorCode.CONFLICT, "라커 상태 갱신에 실패했습니다."));

        return closed;
    }

    private NormalizedSlotRequest normalizeCreateSlotRequest(CreateSlotRequest request) {
        String lockerZone = normalizeRequiredLockerZone(request.lockerZone());
        Integer lockerNumber = normalizeLockerNumber(request.lockerNumber());
        String lockerCode = buildLockerCode(lockerZone, lockerNumber);
        return new NormalizedSlotRequest(
                lockerCode,
                lockerZone,
                normalizeNullable(request.lockerGrade()),
                normalizeSlotStatus(request.lockerStatus()),
                request.memo()
        );
    }

    private String normalizeRequiredLockerZone(String lockerZone) {
        String normalized = normalizeNullable(lockerZone);
        if (normalized == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "lockerZone is required");
        }
        return normalized.toUpperCase();
    }

    private String normalizeLockerZoneOrNull(String lockerZone) {
        String normalized = normalizeNullable(lockerZone);
        return normalized == null ? null : normalized.toUpperCase();
    }

    private Integer normalizeLockerNumber(Integer lockerNumber) {
        if (lockerNumber == null || lockerNumber < 1) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "lockerNumber is required");
        }
        return lockerNumber;
    }

    private String buildLockerCode(String lockerZone, Integer lockerNumber) {
        String numberPart = lockerNumber < 100 ? String.format("%02d", lockerNumber) : lockerNumber.toString();
        String code = lockerZone + "-" + numberPart;
        if (code.length() > 40) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "lockerCode is too long");
        }
        return code;
    }

    private String normalizeSlotStatus(String lockerStatus) {
        if (lockerStatus == null || lockerStatus.isBlank()) {
            return "AVAILABLE";
        }
        String normalized = lockerStatus.trim().toUpperCase();
        if (!"AVAILABLE".equals(normalized) && !"ASSIGNED".equals(normalized) && !"MAINTENANCE".equals(normalized)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "lockerStatus is invalid");
        }
        return normalized;
    }

    private String normalizeNullable(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private ApiException mapSlotWriteError(DataAccessException ex) {
        String message = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        if (message != null && message.contains("uk_locker_slots_center_code_active")) {
            return new ApiException(ErrorCode.CONFLICT, "이미 존재하는 라커 코드입니다.");
        }
        return new ApiException(ErrorCode.INTERNAL_ERROR, "라커 슬롯 저장 중 오류가 발생했습니다.");
    }

    private ApiException mapAssignmentWriteError(DataAccessException ex) {
        String message = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        if (message != null && message.contains("uk_locker_assignments_active_slot")) {
            return new ApiException(ErrorCode.CONFLICT, "이미 배정된 라커입니다.");
        }
        if (message != null && message.contains("uk_locker_assignments_active_member")) {
            return new ApiException(ErrorCode.CONFLICT, "회원에게 이미 활성 라커가 배정되어 있습니다.");
        }
        return new ApiException(ErrorCode.INTERNAL_ERROR, "라커 배정 처리 중 오류가 발생했습니다.");
    }

    public record CreateSlotRequest(
            String lockerZone,
            Integer lockerNumber,
            String lockerGrade,
            String lockerStatus,
            String memo
    ) {
    }

    private record NormalizedSlotRequest(
            String lockerCode,
            String lockerZone,
            String lockerGrade,
            String lockerStatus,
            String memo
    ) {
    }

    public record AssignRequest(
            Long lockerSlotId,
            Long memberId,
            LocalDate startDate,
            LocalDate endDate,
            String memo
    ) {
    }

    public record ReturnRequest(
            Long lockerAssignmentId,
            OffsetDateTime returnedAt,
            BigDecimal refundAmount,
            String returnReason,
            String memo
    ) {
    }
}
