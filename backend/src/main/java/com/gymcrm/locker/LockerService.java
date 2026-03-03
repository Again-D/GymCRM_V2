package com.gymcrm.locker;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.member.Member;
import com.gymcrm.member.MemberRepository;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

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
        String code = normalizeLockerCode(request.lockerCode());
        String status = normalizeSlotStatus(request.lockerStatus());

        try {
            return lockerSlotRepository.insert(new LockerSlotRepository.InsertCommand(
                    currentUserProvider.currentCenterId(),
                    code,
                    normalizeNullable(request.lockerZone()),
                    normalizeNullable(request.lockerGrade()),
                    status,
                    request.memo(),
                    currentUserProvider.currentUserId()
            ));
        } catch (DataAccessException ex) {
            throw mapSlotWriteError(ex);
        }
    }

    @Transactional(readOnly = true)
    public List<LockerSlot> listSlots(String lockerStatus, String lockerZone) {
        String normalizedStatus = lockerStatus == null ? null : normalizeSlotStatus(lockerStatus);
        String normalizedZone = normalizeNullable(lockerZone);
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

    private String normalizeLockerCode(String lockerCode) {
        if (lockerCode == null || lockerCode.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "lockerCode is required");
        }
        return lockerCode.trim().toUpperCase();
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
