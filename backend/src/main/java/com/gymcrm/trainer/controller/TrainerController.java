package com.gymcrm.trainer.controller;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.security.AccessPolicies;
import com.gymcrm.trainer.dto.request.CreateTrainerRequest;
import com.gymcrm.trainer.dto.request.UpdateTrainerRequest;
import com.gymcrm.trainer.dto.request.UpdateTrainerStatusRequest;
import com.gymcrm.trainer.dto.response.TrainerAdminDetailResponse;
import com.gymcrm.trainer.dto.response.TrainerDeskDetailResponse;
import com.gymcrm.trainer.dto.response.TrainerSummaryResponse;
import com.gymcrm.trainer.entity.TrainerDetail;
import com.gymcrm.trainer.service.TrainerService;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/trainers")
@Validated
public class TrainerController {
    private final TrainerService trainerService;

    public TrainerController(TrainerService trainerService) {
        this.trainerService = trainerService;
    }

    @GetMapping
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK)
    public ApiResponse<List<TrainerSummaryResponse>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long centerId
    ) {
        List<TrainerSummaryResponse> items = trainerService.list(status, keyword, centerId).stream()
                .map(TrainerSummaryResponse::from)
                .toList();
        return ApiResponse.success(items, "트레이너 목록 조회 성공");
    }

    @GetMapping("/{userId}")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK)
    public ApiResponse<?> detail(@PathVariable Long userId) {
        TrainerDetail detail = trainerService.getDetail(userId);
        if (detail.accountFieldsVisible()) {
            return ApiResponse.success(TrainerAdminDetailResponse.from(detail), "트레이너 상세 조회 성공");
        }
        return ApiResponse.success(TrainerDeskDetailResponse.from(detail), "트레이너 상세 조회 성공");
    }

    @PostMapping
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER)
    public ApiResponse<TrainerAdminDetailResponse> create(@Valid @RequestBody CreateTrainerRequest request) {
        TrainerDetail detail = trainerService.create(new TrainerService.CreateTrainerCommand(
                request.centerId(),
                request.loginId(),
                request.password(),
                request.userName(),
                request.phone(),
                request.ptSessionUnitPrice(),
                request.gxSessionUnitPrice()
        ));
        return ApiResponse.success(TrainerAdminDetailResponse.from(detail), "트레이너 계정을 등록했습니다.");
    }

    @PatchMapping("/{userId}")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER)
    public ApiResponse<TrainerAdminDetailResponse> update(@PathVariable Long userId, @Valid @RequestBody UpdateTrainerRequest request) {
        TrainerDetail detail = trainerService.update(userId, new TrainerService.UpdateTrainerCommand(
                request.loginId(),
                request.userName(),
                request.phone(),
                request.ptSessionUnitPrice(),
                request.gxSessionUnitPrice()
        ));
        return ApiResponse.success(TrainerAdminDetailResponse.from(detail), "트레이너 정보를 수정했습니다.");
    }

    @PatchMapping("/{userId}/status")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER)
    public ApiResponse<TrainerAdminDetailResponse> updateStatus(@PathVariable Long userId, @Valid @RequestBody UpdateTrainerStatusRequest request) {
        TrainerDetail detail = trainerService.updateStatus(userId, request.userStatus());
        return ApiResponse.success(TrainerAdminDetailResponse.from(detail), "트레이너 상태를 변경했습니다.");
    }
}
