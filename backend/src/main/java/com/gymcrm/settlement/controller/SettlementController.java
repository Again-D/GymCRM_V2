package com.gymcrm.settlement.controller;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.security.AccessPolicies;
import com.gymcrm.settlement.dto.request.CreateTrainerSettlementRequest;
import com.gymcrm.settlement.dto.response.CreateTrainerSettlementResponse;
import com.gymcrm.settlement.service.TrainerSettlementCreationService;
import com.gymcrm.settlement.service.TrainerSettlementLifecycleService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/settlements")
public class SettlementController {
    private final TrainerSettlementCreationService trainerSettlementCreationService;
    private final TrainerSettlementLifecycleService trainerSettlementLifecycleService;

    public SettlementController(
            TrainerSettlementCreationService trainerSettlementCreationService,
            TrainerSettlementLifecycleService trainerSettlementLifecycleService
    ) {
        this.trainerSettlementCreationService = trainerSettlementCreationService;
        this.trainerSettlementLifecycleService = trainerSettlementLifecycleService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN)
    public ApiResponse<CreateTrainerSettlementResponse> createSettlement(
            @Valid @RequestBody CreateTrainerSettlementRequest request
    ) {
        TrainerSettlementCreationService.CreateSettlementResult result = trainerSettlementCreationService.create(
                new TrainerSettlementCreationService.CreateSettlementCommand(
                        request.trainerId(),
                        request.periodStart(),
                        request.periodEnd()
                )
        );
        return ApiResponse.success(CreateTrainerSettlementResponse.from(result), "정산이 성공적으로 생성되었습니다.");
    }

    @PostMapping("/{settlementId}/confirm")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN)
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
