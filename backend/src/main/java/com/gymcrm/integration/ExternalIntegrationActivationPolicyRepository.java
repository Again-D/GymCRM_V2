package com.gymcrm.integration;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Optional;

@Repository
public class ExternalIntegrationActivationPolicyRepository {
    private final JdbcClient jdbcClient;

    public ExternalIntegrationActivationPolicyRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public Optional<ExternalIntegrationActivationPolicy> findByCenterId(Long centerId) {
        return jdbcClient.sql("""
                SELECT
                    external_integration_activation_policy_id,
                    center_id,
                    activation_stage,
                    payment_enabled,
                    messaging_enabled,
                    qr_enabled,
                    last_drill_outcome,
                    last_drill_at,
                    last_drill_summary,
                    created_at,
                    updated_at
                FROM external_integration_activation_policies
                WHERE center_id = :centerId
                  AND is_deleted = FALSE
                """)
                .param("centerId", centerId)
                .query(ExternalIntegrationActivationPolicy.class)
                .optional();
    }

    public ExternalIntegrationActivationPolicy upsert(UpsertCommand command) {
        return jdbcClient.sql("""
                INSERT INTO external_integration_activation_policies (
                    center_id, activation_stage,
                    payment_enabled, messaging_enabled, qr_enabled,
                    created_by, updated_by
                ) VALUES (
                    :centerId, :activationStage,
                    :paymentEnabled, :messagingEnabled, :qrEnabled,
                    :actorUserId, :actorUserId
                )
                ON CONFLICT (center_id) WHERE is_deleted = FALSE
                DO UPDATE
                SET activation_stage = EXCLUDED.activation_stage,
                    payment_enabled = EXCLUDED.payment_enabled,
                    messaging_enabled = EXCLUDED.messaging_enabled,
                    qr_enabled = EXCLUDED.qr_enabled,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = EXCLUDED.updated_by
                RETURNING
                    external_integration_activation_policy_id,
                    center_id,
                    activation_stage,
                    payment_enabled,
                    messaging_enabled,
                    qr_enabled,
                    last_drill_outcome,
                    last_drill_at,
                    last_drill_summary,
                    created_at,
                    updated_at
                """)
                .paramSource(command)
                .query(ExternalIntegrationActivationPolicy.class)
                .single();
    }

    public Optional<ExternalIntegrationActivationPolicy> updateDrillStatus(UpdateDrillStatusCommand command) {
        return jdbcClient.sql("""
                UPDATE external_integration_activation_policies
                SET last_drill_outcome = :lastDrillOutcome,
                    last_drill_summary = :lastDrillSummary,
                    last_drill_at = :lastDrillAt,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = :actorUserId
                WHERE center_id = :centerId
                  AND is_deleted = FALSE
                RETURNING
                    external_integration_activation_policy_id,
                    center_id,
                    activation_stage,
                    payment_enabled,
                    messaging_enabled,
                    qr_enabled,
                    last_drill_outcome,
                    last_drill_at,
                    last_drill_summary,
                    created_at,
                    updated_at
                """)
                .paramSource(command)
                .query(ExternalIntegrationActivationPolicy.class)
                .optional();
    }

    public record UpsertCommand(
            Long centerId,
            String activationStage,
            boolean paymentEnabled,
            boolean messagingEnabled,
            boolean qrEnabled,
            Long actorUserId
    ) {}

    public record UpdateDrillStatusCommand(
            Long centerId,
            String lastDrillOutcome,
            String lastDrillSummary,
            OffsetDateTime lastDrillAt,
            Long actorUserId
    ) {}
}
