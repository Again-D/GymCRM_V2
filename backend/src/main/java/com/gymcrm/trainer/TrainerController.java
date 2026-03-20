package com.gymcrm.trainer;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.security.AccessPolicies;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
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
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<?> detail(@PathVariable Long userId) {
        TrainerService.TrainerDetail detail = trainerService.getDetail(userId);
        if (detail.accountFieldsVisible()) {
            return ApiResponse.success(TrainerAdminDetailResponse.from(detail), "트레이너 상세 조회 성공");
        }
        return ApiResponse.success(TrainerDeskDetailResponse.from(detail), "트레이너 상세 조회 성공");
    }

    @PostMapping
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN)
    public ApiResponse<TrainerAdminDetailResponse> create(@Valid @RequestBody CreateTrainerRequest request) {
        TrainerService.TrainerDetail detail = trainerService.create(new TrainerService.CreateTrainerCommand(
                request.centerId(),
                request.loginId(),
                request.password(),
                request.displayName(),
                request.phone()
        ));
        return ApiResponse.success(TrainerAdminDetailResponse.from(detail), "트레이너 계정을 등록했습니다.");
    }

    @PatchMapping("/{userId}")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN)
    public ApiResponse<TrainerAdminDetailResponse> update(@PathVariable Long userId, @Valid @RequestBody UpdateTrainerRequest request) {
        TrainerService.TrainerDetail detail = trainerService.update(userId, new TrainerService.UpdateTrainerCommand(
                request.loginId(),
                request.displayName(),
                request.phone()
        ));
        return ApiResponse.success(TrainerAdminDetailResponse.from(detail), "트레이너 정보를 수정했습니다.");
    }

    @PatchMapping("/{userId}/status")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN)
    public ApiResponse<TrainerAdminDetailResponse> updateStatus(@PathVariable Long userId, @Valid @RequestBody UpdateTrainerStatusRequest request) {
        TrainerService.TrainerDetail detail = trainerService.updateStatus(userId, request.userStatus());
        return ApiResponse.success(TrainerAdminDetailResponse.from(detail), "트레이너 상태를 변경했습니다.");
    }

    public record CreateTrainerRequest(
            @NotNull(message = "centerId is required") Long centerId,
            @NotBlank(message = "loginId is required") String loginId,
            @NotBlank(message = "password is required") String password,
            @NotBlank(message = "displayName is required") String displayName,
            String phone
    ) {
    }

    public record UpdateTrainerRequest(
            @NotBlank(message = "loginId is required") String loginId,
            @NotBlank(message = "displayName is required") String displayName,
            String phone
    ) {
    }

    public record UpdateTrainerStatusRequest(
            @NotBlank(message = "userStatus is required") String userStatus
    ) {
    }

    public record TrainerSummaryResponse(
            Long userId,
            Long centerId,
            String displayName,
            String userStatus,
            String phone,
            Long assignedMemberCount,
            Long todayConfirmedReservationCount
    ) {
        static TrainerSummaryResponse from(TrainerService.TrainerSummary trainer) {
            return new TrainerSummaryResponse(
                    trainer.userId(),
                    trainer.centerId(),
                    trainer.displayName(),
                    trainer.userStatus(),
                    trainer.phone(),
                    trainer.assignedMemberCount(),
                    trainer.todayConfirmedReservationCount()
            );
        }
    }

    public record AssignedMemberResponse(
            Long memberId,
            String memberName,
            Long membershipId,
            String membershipStatus
    ) {
        static AssignedMemberResponse from(TrainerService.AssignedMemberSummary member) {
            return new AssignedMemberResponse(
                    member.memberId(),
                    member.memberName(),
                    member.membershipId(),
                    member.membershipStatus()
            );
        }
    }

    public record TrainerAdminDetailResponse(
            Long userId,
            Long centerId,
            String loginId,
            String displayName,
            String userStatus,
            String phone,
            Long assignedMemberCount,
            Long todayConfirmedReservationCount,
            List<AssignedMemberResponse> assignedMembers
    ) {
        static TrainerAdminDetailResponse from(TrainerService.TrainerDetail detail) {
            return new TrainerAdminDetailResponse(
                    detail.userId(),
                    detail.centerId(),
                    detail.loginId(),
                    detail.displayName(),
                    detail.userStatus(),
                    detail.phone(),
                    detail.assignedMemberCount(),
                    detail.todayConfirmedReservationCount(),
                    detail.assignedMembers().stream().map(AssignedMemberResponse::from).toList()
            );
        }
    }

    public record TrainerDeskDetailResponse(
            Long userId,
            Long centerId,
            String displayName,
            String userStatus,
            String phone,
            Long assignedMemberCount,
            Long todayConfirmedReservationCount,
            List<AssignedMemberResponse> assignedMembers
    ) {
        static TrainerDeskDetailResponse from(TrainerService.TrainerDetail detail) {
            return new TrainerDeskDetailResponse(
                    detail.userId(),
                    detail.centerId(),
                    detail.displayName(),
                    detail.userStatus(),
                    detail.phone(),
                    detail.assignedMemberCount(),
                    detail.todayConfirmedReservationCount(),
                    detail.assignedMembers().stream().map(AssignedMemberResponse::from).toList()
            );
        }
    }
}
