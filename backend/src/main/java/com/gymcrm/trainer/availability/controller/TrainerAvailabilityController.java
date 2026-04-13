package com.gymcrm.trainer.availability.controller;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.security.AccessPolicies;
import com.gymcrm.trainer.availability.dto.request.ReplaceTrainerAvailabilityWeeklyRulesRequest;
import com.gymcrm.trainer.availability.dto.request.UpsertTrainerAvailabilityExceptionRequest;
import com.gymcrm.trainer.availability.dto.response.TrainerAvailabilitySnapshotResponse;
import com.gymcrm.trainer.availability.repository.TrainerAvailabilityRepository;
import com.gymcrm.trainer.availability.service.TrainerAvailabilityService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalTime;

@RestController
@Validated
@RequestMapping("/api/v1/trainers")
public class TrainerAvailabilityController {
    private final TrainerAvailabilityService trainerAvailabilityService;

    public TrainerAvailabilityController(TrainerAvailabilityService trainerAvailabilityService) {
        this.trainerAvailabilityService = trainerAvailabilityService;
    }

    @GetMapping("/me/availability")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK_OR_TRAINER)
    public ApiResponse<TrainerAvailabilitySnapshotResponse> getMyAvailability(@RequestParam String month) {
        return ApiResponse.success(
                TrainerAvailabilitySnapshotResponse.from(trainerAvailabilityService.getMyAvailability(month)),
                "내 스케줄 조회 성공"
        );
    }

    @PutMapping("/me/availability/weekly")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK_OR_TRAINER)
    public ApiResponse<TrainerAvailabilitySnapshotResponse> replaceMyWeeklyRules(
            @RequestParam String month,
            @Valid @RequestBody ReplaceTrainerAvailabilityWeeklyRulesRequest request
    ) {
        return ApiResponse.success(
                TrainerAvailabilitySnapshotResponse.from(trainerAvailabilityService.replaceMyWeeklyRules(
                        request.rules().stream()
                                .map(rule -> new TrainerAvailabilityRepository.WeeklyRuleCommand(
                                        rule.dayOfWeek(),
                                        LocalTime.parse(rule.startTime()),
                                        LocalTime.parse(rule.endTime())
                                ))
                                .toList(),
                        month
                )),
                "기본 주간 스케줄을 저장했습니다."
        );
    }

    @PutMapping("/me/availability/exceptions/{date}")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK_OR_TRAINER)
    public ApiResponse<TrainerAvailabilitySnapshotResponse> upsertMyException(
            @PathVariable LocalDate date,
            @RequestParam String month,
            @Valid @RequestBody UpsertTrainerAvailabilityExceptionRequest request
    ) {
        return ApiResponse.success(
                TrainerAvailabilitySnapshotResponse.from(trainerAvailabilityService.upsertMyException(
                        new TrainerAvailabilityRepository.ExceptionCommand(
                                date,
                                request.exceptionType().trim().toUpperCase(),
                                request.overrideStartTime() == null || request.overrideStartTime().isBlank() ? null : LocalTime.parse(request.overrideStartTime()),
                                request.overrideEndTime() == null || request.overrideEndTime().isBlank() ? null : LocalTime.parse(request.overrideEndTime()),
                                normalizeNullable(request.memo())
                        ),
                        month
                )),
                "예외 스케줄을 저장했습니다."
        );
    }

    @DeleteMapping("/me/availability/exceptions/{date}")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK_OR_TRAINER)
    public ApiResponse<TrainerAvailabilitySnapshotResponse> deleteMyException(
            @PathVariable LocalDate date,
            @RequestParam String month
    ) {
        return ApiResponse.success(
                TrainerAvailabilitySnapshotResponse.from(trainerAvailabilityService.deleteMyException(date, month)),
                "예외 스케줄을 삭제했습니다."
        );
    }

    @GetMapping("/{trainerUserId}/availability")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK_OR_TRAINER)
    public ApiResponse<TrainerAvailabilitySnapshotResponse> getTrainerAvailability(
            @PathVariable Long trainerUserId,
            @RequestParam String month
    ) {
        return ApiResponse.success(
                TrainerAvailabilitySnapshotResponse.from(trainerAvailabilityService.getTrainerAvailability(trainerUserId, month)),
                "트레이너 스케줄 조회 성공"
        );
    }

    private String normalizeNullable(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
