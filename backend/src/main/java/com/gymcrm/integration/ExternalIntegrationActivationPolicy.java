package com.gymcrm.integration;

import java.time.OffsetDateTime;

public record ExternalIntegrationActivationPolicy(
        Long externalIntegrationActivationPolicyId,
        Long centerId,
        String activationStage,
        boolean paymentEnabled,
        boolean messagingEnabled,
        boolean qrEnabled,
        String lastDrillOutcome,
        OffsetDateTime lastDrillAt,
        String lastDrillSummary,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
