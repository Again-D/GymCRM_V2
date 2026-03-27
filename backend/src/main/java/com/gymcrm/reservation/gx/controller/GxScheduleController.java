package com.gymcrm.reservation.gx.controller;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.security.AccessPolicies;
import com.gymcrm.reservation.gx.dto.request.CreateGxScheduleRuleRequest;
import com.gymcrm.reservation.gx.dto.request.UpdateGxScheduleRuleRequest;
import com.gymcrm.reservation.gx.dto.request.UpsertGxScheduleExceptionRequest;
import com.gymcrm.reservation.gx.dto.response.GxScheduleSnapshotResponse;
import com.gymcrm.reservation.gx.service.GxScheduleService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalTime;

@Validated
@RestController
@RequestMapping("/api/v1/reservations/gx")
public class GxScheduleController {
    private final GxScheduleService gxScheduleService;

    public GxScheduleController(GxScheduleService gxScheduleService) {
        this.gxScheduleService = gxScheduleService;
    }

    @GetMapping("/snapshot")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_MANAGER_OR_DESK_OR_TRAINER)
    public ApiResponse<GxScheduleSnapshotResponse> getSnapshot(@RequestParam String month) {
        return ApiResponse.success(
                GxScheduleSnapshotResponse.from(gxScheduleService.getSnapshot(month)),
                "GX 스케줄 스냅샷 조회 성공"
        );
    }

    @PostMapping("/rules")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_MANAGER_OR_DESK_OR_TRAINER)
    public ApiResponse<GxScheduleSnapshotResponse> createRule(
            @RequestParam String month,
            @Valid @RequestBody CreateGxScheduleRuleRequest request
    ) {
        return ApiResponse.success(
                GxScheduleSnapshotResponse.from(gxScheduleService.createRule(new GxScheduleService.CreateRuleRequest(
                        month,
                        request.className(),
                        request.trainerUserId(),
                        request.dayOfWeek(),
                        LocalTime.parse(request.startTime()),
                        LocalTime.parse(request.endTime()),
                        request.capacity(),
                        LocalDate.parse(request.effectiveStartDate())
                ))),
                "GX 반복 규칙을 생성했습니다."
        );
    }

    @PutMapping("/rules/{ruleId}")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_MANAGER_OR_DESK_OR_TRAINER)
    public ApiResponse<GxScheduleSnapshotResponse> updateRule(
            @PathVariable Long ruleId,
            @RequestParam String month,
            @Valid @RequestBody UpdateGxScheduleRuleRequest request
    ) {
        return ApiResponse.success(
                GxScheduleSnapshotResponse.from(gxScheduleService.updateRule(new GxScheduleService.UpdateRuleRequest(
                        month,
                        ruleId,
                        request.className(),
                        request.trainerUserId(),
                        request.dayOfWeek(),
                        LocalTime.parse(request.startTime()),
                        LocalTime.parse(request.endTime()),
                        request.capacity(),
                        LocalDate.parse(request.effectiveStartDate()),
                        request.active()
                ))),
                "GX 반복 규칙을 저장했습니다."
        );
    }

    @DeleteMapping("/rules/{ruleId}")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_MANAGER_OR_DESK_OR_TRAINER)
    public ApiResponse<GxScheduleSnapshotResponse> deleteRule(
            @PathVariable Long ruleId,
            @RequestParam String month
    ) {
        return ApiResponse.success(
                GxScheduleSnapshotResponse.from(gxScheduleService.deleteRule(ruleId, month)),
                "GX 반복 규칙을 종료했습니다."
        );
    }

    @PutMapping("/rules/{ruleId}/exceptions/{date}")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_MANAGER_OR_DESK_OR_TRAINER)
    public ApiResponse<GxScheduleSnapshotResponse> upsertException(
            @PathVariable Long ruleId,
            @PathVariable LocalDate date,
            @RequestParam String month,
            @Valid @RequestBody UpsertGxScheduleExceptionRequest request
    ) {
        return ApiResponse.success(
                GxScheduleSnapshotResponse.from(gxScheduleService.upsertException(new GxScheduleService.UpsertExceptionRequest(
                        month,
                        ruleId,
                        date,
                        request.exceptionType(),
                        request.overrideTrainerUserId(),
                        request.overrideStartTime() == null || request.overrideStartTime().isBlank() ? null : LocalTime.parse(request.overrideStartTime()),
                        request.overrideEndTime() == null || request.overrideEndTime().isBlank() ? null : LocalTime.parse(request.overrideEndTime()),
                        request.overrideCapacity(),
                        request.memo()
                ))),
                "GX 회차 예외를 저장했습니다."
        );
    }

    @DeleteMapping("/rules/{ruleId}/exceptions/{date}")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_MANAGER_OR_DESK_OR_TRAINER)
    public ApiResponse<GxScheduleSnapshotResponse> deleteException(
            @PathVariable Long ruleId,
            @PathVariable LocalDate date,
            @RequestParam String month
    ) {
        return ApiResponse.success(
                GxScheduleSnapshotResponse.from(gxScheduleService.deleteException(ruleId, date, month)),
                "GX 회차 예외를 삭제했습니다."
        );
    }
}
