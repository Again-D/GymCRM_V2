package com.gymcrm.settlement.controller;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.security.AccessPolicies;
import com.gymcrm.settlement.dto.request.CreateTrainerSettlementRequest;
import com.gymcrm.settlement.dto.request.PreviewTrainerSettlementRequest;
import com.gymcrm.settlement.dto.response.CreateTrainerSettlementResponse;
import com.gymcrm.settlement.dto.response.PreviewTrainerSettlementResponse;
import com.gymcrm.settlement.service.TrainerSettlementCreationService;
import com.gymcrm.settlement.service.TrainerSettlementLifecycleService;
import com.gymcrm.settlement.service.TrainerSettlementPreviewService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/settlements")
public class SettlementController {
    private final TrainerSettlementCreationService trainerSettlementCreationService;
    private final TrainerSettlementLifecycleService trainerSettlementLifecycleService;
    private final TrainerSettlementPreviewService trainerSettlementPreviewService;

    public SettlementController(
            TrainerSettlementCreationService trainerSettlementCreationService,
            TrainerSettlementLifecycleService trainerSettlementLifecycleService,
            TrainerSettlementPreviewService trainerSettlementPreviewService
    ) {
        this.trainerSettlementCreationService = trainerSettlementCreationService;
        this.trainerSettlementLifecycleService = trainerSettlementLifecycleService;
        this.trainerSettlementPreviewService = trainerSettlementPreviewService;
    }

    @GetMapping("/preview")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK)
    public ApiResponse<PreviewTrainerSettlementResponse> previewSettlement(
            @RequestParam String trainerId,
            @RequestParam(required = false, defaultValue = "")
            @Pattern(regexp = "^$|^\\d{4}-\\d{2}$", message = "settlementMonth must be YYYY-MM")
            String settlementMonth,
            @RequestParam(required = false, defaultValue = "")
            @Pattern(regexp = "^$|^\\d{4}-\\d{2}-\\d{2}$", message = "periodStart must be yyyy-MM-dd")
            String periodStart,
            @RequestParam(required = false, defaultValue = "")
            @Pattern(regexp = "^$|^\\d{4}-\\d{2}-\\d{2}$", message = "periodEnd must be yyyy-MM-dd")
            String periodEnd
    ) {
        return ApiResponse.success(
                PreviewTrainerSettlementResponse.from(
                        trainerSettlementPreviewService.preview(new PreviewTrainerSettlementRequest(
                                trainerId,
                                settlementMonth,
                                periodStart,
                                periodEnd
                        ))
                ),
                "트레이너 정산 preview 조회 성공"
        );
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER)
    public ApiResponse<CreateTrainerSettlementResponse> createSettlement(
            @Valid @RequestBody CreateTrainerSettlementRequest request
    ) {
        TrainerSettlementCreationService.CreateSettlementResult result = trainerSettlementCreationService.create(
                new TrainerSettlementCreationService.CreateSettlementCommand(
                        request.trainerId(),
                        request.settlementMonth(),
                        request.periodStart(),
                        request.periodEnd()
                )
        );
        return ApiResponse.success(CreateTrainerSettlementResponse.from(result), "정산이 성공적으로 생성되었습니다.");
    }

    @PostMapping("/{settlementId}/confirm")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER)
    public ApiResponse<ConfirmSettlementResponse> confirmSettlement(@PathVariable Long settlementId) {
        TrainerSettlementLifecycleService.ConfirmSettlementResult result =
                trainerSettlementLifecycleService.confirmSettlement(settlementId);
        return ApiResponse.success(
                new ConfirmSettlementResponse(result.settlementId(), result.status(), result.confirmedAt().toString()),
                "정산이 성공적으로 확정되었습니다."
        );
    }

    public record ConfirmSettlementResponse(
            Long settlementId,
            String status,
            String confirmedAt
    ) {
    }
}
