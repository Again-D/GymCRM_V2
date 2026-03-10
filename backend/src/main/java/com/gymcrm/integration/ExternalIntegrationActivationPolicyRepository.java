package com.gymcrm.integration;

import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;

@Repository
public class ExternalIntegrationActivationPolicyRepository {
    private final ExternalIntegrationActivationPolicyJpaRepository jpaRepository;
    private final ExternalIntegrationActivationPolicyQueryRepository queryRepository;
    private final EntityManager entityManager;

    public ExternalIntegrationActivationPolicyRepository(
            ExternalIntegrationActivationPolicyJpaRepository jpaRepository,
            ExternalIntegrationActivationPolicyQueryRepository queryRepository,
            EntityManager entityManager
    ) {
        this.jpaRepository = jpaRepository;
        this.queryRepository = queryRepository;
        this.entityManager = entityManager;
    }

    public Optional<ExternalIntegrationActivationPolicy> findByCenterId(Long centerId) {
        entityManager.clear();
        return jpaRepository.findByCenterIdAndIsDeletedFalse(centerId).map(this::toDomain);
    }

    @Transactional
    public ExternalIntegrationActivationPolicy upsert(UpsertCommand command) {
        return queryRepository.updateExisting(command)
                .orElseGet(() -> insertNew(command));
    }

    @Transactional
    public Optional<ExternalIntegrationActivationPolicy> updateDrillStatus(UpdateDrillStatusCommand command) {
        return queryRepository.updateDrillStatus(command);
    }

    private ExternalIntegrationActivationPolicy insertNew(UpsertCommand command) {
        ExternalIntegrationActivationPolicyEntity entity = new ExternalIntegrationActivationPolicyEntity();
        entity.setCenterId(command.centerId());
        entity.setActivationStage(command.activationStage());
        entity.setPaymentEnabled(command.paymentEnabled());
        entity.setMessagingEnabled(command.messagingEnabled());
        entity.setQrEnabled(command.qrEnabled());
        entity.setDeleted(false);
        OffsetDateTime now = OffsetDateTime.now();
        entity.setCreatedAt(now);
        entity.setCreatedBy(command.actorUserId());
        entity.setUpdatedAt(now);
        entity.setUpdatedBy(command.actorUserId());
        ExternalIntegrationActivationPolicyEntity saved = jpaRepository.saveAndFlush(entity);
        entityManager.refresh(saved);
        return toDomain(saved);
    }

    private ExternalIntegrationActivationPolicy toDomain(ExternalIntegrationActivationPolicyEntity entity) {
        return new ExternalIntegrationActivationPolicy(
                entity.getExternalIntegrationActivationPolicyId(),
                entity.getCenterId(),
                entity.getActivationStage(),
                entity.isPaymentEnabled(),
                entity.isMessagingEnabled(),
                entity.isQrEnabled(),
                entity.getLastDrillOutcome(),
                entity.getLastDrillAt(),
                entity.getLastDrillSummary(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
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
