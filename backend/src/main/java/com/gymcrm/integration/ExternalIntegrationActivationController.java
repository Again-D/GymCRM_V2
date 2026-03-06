package com.gymcrm.integration;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.security.AccessPolicies;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1/integrations/external")
public class ExternalIntegrationActivationController {
    private final ExternalIntegrationActivationService activationService;

    public ExternalIntegrationActivationController(ExternalIntegrationActivationService activationService) {
        this.activationService = activationService;
    }

    @GetMapping("/activation-policy")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN)
    public ApiResponse<PolicyResponse> getPolicy() {
        return ApiResponse.success(
                PolicyResponse.from(activationService.getPolicy()),
                "외부 연동 활성화 정책 조회 성공"
        );
    }

    @PutMapping("/activation-policy")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN)
    public ApiResponse<PolicyResponse> updatePolicy(@Valid @RequestBody UpdatePolicyRequest request) {
        ExternalIntegrationActivationPolicy policy = activationService.updatePolicy(
                new ExternalIntegrationActivationService.UpdatePolicyRequest(
                        request.activationStage(),
                        Boolean.TRUE.equals(request.paymentEnabled()),
                        Boolean.TRUE.equals(request.messagingEnabled()),
                        Boolean.TRUE.equals(request.qrEnabled())
                )
        );
        return ApiResponse.success(PolicyResponse.from(policy), "외부 연동 활성화 정책이 저장되었습니다.");
    }

    @PostMapping("/sandbox-drill")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN)
    public ApiResponse<DrillResponse> runSandboxDrill(@Valid @RequestBody RunDrillRequest request) {
        ExternalIntegrationActivationService.DrillResult result = activationService.runSandboxDrill(
                new ExternalIntegrationActivationService.RunDrillRequest(
                        request.memberId(),
                        request.amount(),
                        request.paymentMethod(),
                        request.phone(),
                        request.deviceId(),
                        request.paymentApproveFailureMode(),
                        request.alimtalkFailureMode(),
                        request.smsFailureMode(),
                        request.qrFailureMode(),
                        request.paymentCancelFailureMode()
                )
        );
        return ApiResponse.success(DrillResponse.from(result), "외부 연동 sandbox drill 실행 완료");
    }

    public record UpdatePolicyRequest(
            @NotBlank
            @Pattern(regexp = "^(?i)(SANDBOX|STAGING|PRODUCTION)$", message = "activationStage is invalid")
            String activationStage,
            Boolean paymentEnabled,
            Boolean messagingEnabled,
            Boolean qrEnabled
    ) {
    }

    public record RunDrillRequest(
            Long memberId,
            @DecimalMin(value = "0.01", message = "amount must be greater than 0")
            BigDecimal amount,
            String paymentMethod,
            String phone,
            String deviceId,
            @Pattern(regexp = "^(?i)(NONE|TIMEOUT|HTTP_5XX|OFFLINE)?$", message = "failureMode is invalid")
            String paymentApproveFailureMode,
            @Pattern(regexp = "^(?i)(NONE|TIMEOUT|HTTP_5XX|OFFLINE)?$", message = "failureMode is invalid")
            String alimtalkFailureMode,
            @Pattern(regexp = "^(?i)(NONE|TIMEOUT|HTTP_5XX|OFFLINE)?$", message = "failureMode is invalid")
            String smsFailureMode,
            @Pattern(regexp = "^(?i)(NONE|TIMEOUT|HTTP_5XX|OFFLINE)?$", message = "failureMode is invalid")
            String qrFailureMode,
            @Pattern(regexp = "^(?i)(NONE|TIMEOUT|HTTP_5XX|OFFLINE)?$", message = "failureMode is invalid")
            String paymentCancelFailureMode
    ) {
    }

    public record PolicyResponse(
            Long centerId,
            String activationStage,
            boolean paymentEnabled,
            boolean messagingEnabled,
            boolean qrEnabled,
            String lastDrillOutcome,
            OffsetDateTime lastDrillAt,
            String lastDrillSummary
    ) {
        static PolicyResponse from(ExternalIntegrationActivationPolicy policy) {
            return new PolicyResponse(
                    policy.centerId(),
                    policy.activationStage(),
                    policy.paymentEnabled(),
                    policy.messagingEnabled(),
                    policy.qrEnabled(),
                    policy.lastDrillOutcome(),
                    policy.lastDrillAt(),
                    policy.lastDrillSummary()
            );
        }
    }

    public record DrillResponse(
            String outcome,
            boolean paymentApproved,
            boolean messageSent,
            boolean fallbackToSms,
            boolean qrGateOpened,
            boolean compensationTriggered,
            boolean compensationSucceeded,
            String messageFailureMode,
            List<String> logs,
            PolicyResponse policy
    ) {
        static DrillResponse from(ExternalIntegrationActivationService.DrillResult result) {
            ExternalIntegrationReadinessService.ReadinessResult readiness = result.readiness();
            return new DrillResponse(
                    readiness.outcome(),
                    readiness.paymentApproved(),
                    readiness.messageSent(),
                    readiness.fallbackToSms(),
                    readiness.qrGateOpened(),
                    readiness.compensationTriggered(),
                    readiness.compensationSucceeded(),
                    readiness.messageFailureMode(),
                    readiness.logs(),
                    PolicyResponse.from(result.policy())
            );
        }
    }
}
