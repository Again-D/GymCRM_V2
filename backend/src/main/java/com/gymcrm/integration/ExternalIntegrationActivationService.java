package com.gymcrm.integration;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Service
public class ExternalIntegrationActivationService {
    private final ExternalIntegrationActivationPolicyRepository policyRepository;
    private final ExternalIntegrationReadinessService readinessService;
    private final CurrentUserProvider currentUserProvider;

    public ExternalIntegrationActivationService(
            ExternalIntegrationActivationPolicyRepository policyRepository,
            ExternalIntegrationReadinessService readinessService,
            CurrentUserProvider currentUserProvider
    ) {
        this.policyRepository = policyRepository;
        this.readinessService = readinessService;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional(readOnly = true)
    public ExternalIntegrationActivationPolicy getPolicy() {
        return policyRepository.findByCenterId(currentUserProvider.currentCenterId())
                .orElseGet(() -> defaultPolicy(currentUserProvider.currentCenterId()));
    }

    @Transactional
    public ExternalIntegrationActivationPolicy updatePolicy(UpdatePolicyRequest request) {
        String stage = normalizeStage(request.activationStage());
        return policyRepository.upsert(new ExternalIntegrationActivationPolicyRepository.UpsertCommand(
                currentUserProvider.currentCenterId(),
                stage,
                request.paymentEnabled(),
                request.messagingEnabled(),
                request.qrEnabled(),
                currentUserProvider.currentUserId()
        ));
    }

    @Transactional
    public DrillResult runSandboxDrill(RunDrillRequest request) {
        Long centerId = currentUserProvider.currentCenterId();
        Long actorUserId = currentUserProvider.currentUserId();
        ExternalIntegrationActivationPolicy currentPolicy = policyRepository.findByCenterId(centerId)
                .orElseGet(() -> policyRepository.upsert(new ExternalIntegrationActivationPolicyRepository.UpsertCommand(
                        centerId,
                        "SANDBOX",
                        false,
                        false,
                        false,
                        actorUserId
                )));
        if (!"SANDBOX".equals(currentPolicy.activationStage())) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "sandbox drill is only allowed in SANDBOX stage");
        }

        ExternalIntegrationReadinessService.ReadinessResult readiness = readinessService.runSandboxScenario(
                new ExternalIntegrationReadinessService.SandboxScenario(
                        centerId,
                        request.memberId(),
                        request.amount() == null ? new BigDecimal("10000") : request.amount(),
                        request.paymentMethod() == null || request.paymentMethod().isBlank() ? "CARD" : request.paymentMethod().trim().toUpperCase(),
                        request.phone() == null || request.phone().isBlank() ? "010-1234-5678" : request.phone().trim(),
                        request.deviceId() == null || request.deviceId().isBlank() ? "GATE-01" : request.deviceId().trim(),
                        normalizeFailureMode(request.paymentApproveFailureMode()),
                        normalizeFailureMode(request.alimtalkFailureMode()),
                        normalizeFailureMode(request.smsFailureMode()),
                        normalizeFailureMode(request.qrFailureMode()),
                        normalizeFailureMode(request.paymentCancelFailureMode())
                )
        );

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        String summary = "paymentApproved=%s,messageSent=%s,fallbackToSms=%s,qrGateOpened=%s,compensation=%s"
                .formatted(
                        readiness.paymentApproved(),
                        readiness.messageSent(),
                        readiness.fallbackToSms(),
                        readiness.qrGateOpened(),
                        readiness.compensationTriggered() ? (readiness.compensationSucceeded() ? "SUCCESS" : "FAILED") : "N/A"
                );
        ExternalIntegrationActivationPolicy updatedPolicy = policyRepository.updateDrillStatus(
                new ExternalIntegrationActivationPolicyRepository.UpdateDrillStatusCommand(
                        centerId,
                        readiness.outcome(),
                        summary,
                        now,
                        actorUserId
                )
        ).orElse(currentPolicy);

        return new DrillResult(readiness, updatedPolicy);
    }

    private ExternalIntegrationActivationPolicy defaultPolicy(Long centerId) {
        return new ExternalIntegrationActivationPolicy(
                null,
                centerId,
                "SANDBOX",
                false,
                false,
                false,
                null,
                null,
                null,
                null,
                null
        );
    }

    private String normalizeStage(String stage) {
        if (stage == null || stage.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "activationStage is required");
        }
        String normalized = stage.trim().toUpperCase();
        if (!normalized.equals("SANDBOX") && !normalized.equals("STAGING") && !normalized.equals("PRODUCTION")) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "activationStage is invalid");
        }
        return normalized;
    }

    private String normalizeFailureMode(String mode) {
        if (mode == null || mode.isBlank()) {
            return "NONE";
        }
        String normalized = mode.trim().toUpperCase();
        if (!normalized.equals("NONE")
                && !normalized.equals("TIMEOUT")
                && !normalized.equals("HTTP_5XX")
                && !normalized.equals("OFFLINE")) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "failureMode is invalid");
        }
        return normalized;
    }

    public record UpdatePolicyRequest(
            String activationStage,
            boolean paymentEnabled,
            boolean messagingEnabled,
            boolean qrEnabled
    ) {}

    public record RunDrillRequest(
            Long memberId,
            BigDecimal amount,
            String paymentMethod,
            String phone,
            String deviceId,
            String paymentApproveFailureMode,
            String alimtalkFailureMode,
            String smsFailureMode,
            String qrFailureMode,
            String paymentCancelFailureMode
    ) {}

    public record DrillResult(
            ExternalIntegrationReadinessService.ReadinessResult readiness,
            ExternalIntegrationActivationPolicy policy
    ) {}
}
