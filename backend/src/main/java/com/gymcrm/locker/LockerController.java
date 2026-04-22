package com.gymcrm.locker;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.security.AccessPolicies;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1/lockers")
public class LockerController {
    private final LockerService lockerService;

    public LockerController(LockerService lockerService) {
        this.lockerService = lockerService;
    }

    @PostMapping
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_ADMIN)
    public ApiResponse<LockerSlotResponse> createSlot(@Valid @RequestBody CreateLockerSlotRequest request) {
        LockerSlot slot = lockerService.createSlot(new LockerService.CreateSlotRequest(
                request.lockerZone(),
                request.lockerNumber(),
                request.lockerGrade(),
                request.lockerStatus(),
                request.memo()
        ));
        return ApiResponse.success(LockerSlotResponse.from(slot), "라커가 등록되었습니다.");
    }

    @PostMapping("/batch")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_ADMIN)
    public ApiResponse<List<LockerSlotResponse>> createSlots(@Valid @RequestBody CreateLockerSlotsRequest request) {
        List<LockerSlotResponse> items = lockerService.createSlots(
                request.items().stream()
                        .map(item -> new LockerService.CreateSlotRequest(
                                item.lockerZone(),
                                item.lockerNumber(),
                                item.lockerGrade(),
                                item.lockerStatus(),
                                item.memo()
                        ))
                        .toList()
        ).stream()
                .map(LockerSlotResponse::from)
                .toList();
        return ApiResponse.success(items, "라커가 일괄 등록되었습니다.");
    }

    @GetMapping
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK)
    public ApiResponse<List<LockerSlotResponse>> listSlots(
            @RequestParam(required = false)
            @Pattern(regexp = "^(?i)(AVAILABLE|ASSIGNED|MAINTENANCE)?$", message = "lockerStatus filter is invalid")
            String lockerStatus,
            @RequestParam(required = false) String lockerZone
    ) {
        List<LockerSlotResponse> items = lockerService.listSlots(lockerStatus, lockerZone).stream()
                .map(LockerSlotResponse::from)
                .toList();
        return ApiResponse.success(items, "라커 목록 조회 성공");
    }

    @PostMapping("/assignments")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK)
    public ApiResponse<LockerAssignmentResponse> assign(@Valid @RequestBody AssignLockerRequest request) {
        LockerAssignment assignment = lockerService.assign(new LockerService.AssignRequest(
                request.lockerSlotId(),
                request.memberId(),
                request.startDate(),
                request.endDate(),
                request.memo()
        ));
        return ApiResponse.success(LockerAssignmentResponse.from(assignment), "라커가 배정되었습니다.");
    }

    @PostMapping("/assignments/{lockerAssignmentId}/return")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK)
    public ApiResponse<LockerAssignmentResponse> returnAssignment(
            @PathVariable Long lockerAssignmentId,
            @Valid @RequestBody ReturnLockerRequest request
    ) {
        LockerAssignment assignment = lockerService.returnAssignment(new LockerService.ReturnRequest(
                lockerAssignmentId,
                request.returnedAt(),
                request.refundAmount(),
                request.returnReason(),
                request.memo()
        ));
        return ApiResponse.success(LockerAssignmentResponse.from(assignment), "라커 반납이 처리되었습니다.");
    }

    @GetMapping("/assignments")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK)
    public ApiResponse<List<LockerAssignmentResponse>> listAssignments(
            @RequestParam(defaultValue = "true") boolean activeOnly
    ) {
        List<LockerAssignmentResponse> items = lockerService.listAssignments(activeOnly).stream()
                .map(LockerAssignmentResponse::from)
                .toList();
        return ApiResponse.success(items, "라커 배정 목록 조회 성공");
    }

    public record CreateLockerSlotRequest(
            @NotBlank(message = "lockerZone is required") String lockerZone,
            @NotNull(message = "lockerNumber is required")
            @Min(value = 1, message = "lockerNumber must be at least 1")
            Integer lockerNumber,
            String lockerGrade,
            @Pattern(regexp = "^(?i)(AVAILABLE|ASSIGNED|MAINTENANCE)?$", message = "lockerStatus is invalid")
            String lockerStatus,
            String memo
    ) {
    }

    public record CreateLockerSlotsRequest(
            @NotEmpty(message = "items is required")
            List<@NotNull @Valid CreateLockerSlotRequest> items
    ) {
    }

    public record AssignLockerRequest(
            @NotNull(message = "lockerSlotId is required") Long lockerSlotId,
            @NotNull(message = "memberId is required") Long memberId,
            @NotNull(message = "startDate is required")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate startDate,
            @NotNull(message = "endDate is required")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate endDate,
            String memo
    ) {
    }

    public record ReturnLockerRequest(
            OffsetDateTime returnedAt,
            BigDecimal refundAmount,
            String returnReason,
            String memo
    ) {
    }

    public record LockerSlotResponse(
            Long lockerSlotId,
            Long centerId,
            String lockerCode,
            String lockerZone,
            String lockerGrade,
            String lockerStatus,
            String memo,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
        static LockerSlotResponse from(LockerSlot slot) {
            return new LockerSlotResponse(
                    slot.lockerSlotId(),
                    slot.centerId(),
                    slot.lockerCode(),
                    slot.lockerZone(),
                    slot.lockerGrade(),
                    slot.lockerStatus(),
                    slot.memo(),
                    slot.createdAt(),
                    slot.updatedAt()
            );
        }
    }

    public record LockerAssignmentResponse(
            Long lockerAssignmentId,
            Long centerId,
            Long lockerSlotId,
            Long memberId,
            String assignmentStatus,
            OffsetDateTime assignedAt,
            LocalDate startDate,
            LocalDate endDate,
            OffsetDateTime returnedAt,
            BigDecimal refundAmount,
            String returnReason,
            String memo,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
        static LockerAssignmentResponse from(LockerAssignment assignment) {
            return new LockerAssignmentResponse(
                    assignment.lockerAssignmentId(),
                    assignment.centerId(),
                    assignment.lockerSlotId(),
                    assignment.memberId(),
                    assignment.assignmentStatus(),
                    assignment.assignedAt(),
                    assignment.startDate(),
                    assignment.endDate(),
                    assignment.returnedAt(),
                    assignment.refundAmount(),
                    assignment.returnReason(),
                    assignment.memo(),
                    assignment.createdAt(),
                    assignment.updatedAt()
            );
        }
    }
}
