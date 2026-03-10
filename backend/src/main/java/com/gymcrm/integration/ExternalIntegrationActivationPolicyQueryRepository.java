package com.gymcrm.integration;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Optional;

import static com.gymcrm.integration.QExternalIntegrationActivationPolicyEntity.externalIntegrationActivationPolicyEntity;

@Repository
public class ExternalIntegrationActivationPolicyQueryRepository {
    private final JPAQueryFactory queryFactory;
    private final ExternalIntegrationActivationPolicyJpaRepository jpaRepository;
    private final EntityManager entityManager;

    public ExternalIntegrationActivationPolicyQueryRepository(
            JPAQueryFactory queryFactory,
            ExternalIntegrationActivationPolicyJpaRepository jpaRepository,
            EntityManager entityManager
    ) {
        this.queryFactory = queryFactory;
        this.jpaRepository = jpaRepository;
        this.entityManager = entityManager;
    }

    public Optional<ExternalIntegrationActivationPolicy> updateExisting(ExternalIntegrationActivationPolicyRepository.UpsertCommand command) {
        long updated = queryFactory.update(externalIntegrationActivationPolicyEntity)
                .set(externalIntegrationActivationPolicyEntity.activationStage, command.activationStage())
                .set(externalIntegrationActivationPolicyEntity.paymentEnabled, command.paymentEnabled())
                .set(externalIntegrationActivationPolicyEntity.messagingEnabled, command.messagingEnabled())
                .set(externalIntegrationActivationPolicyEntity.qrEnabled, command.qrEnabled())
                .set(externalIntegrationActivationPolicyEntity.updatedAt, OffsetDateTime.now())
                .set(externalIntegrationActivationPolicyEntity.updatedBy, command.actorUserId())
                .where(
                        externalIntegrationActivationPolicyEntity.centerId.eq(command.centerId()),
                        externalIntegrationActivationPolicyEntity.isDeleted.isFalse()
                )
                .execute();
        if (updated == 0) {
            return Optional.empty();
        }
        entityManager.clear();
        return jpaRepository.findByCenterIdAndIsDeletedFalse(command.centerId()).map(this::toDomain);
    }

    public Optional<ExternalIntegrationActivationPolicy> updateDrillStatus(ExternalIntegrationActivationPolicyRepository.UpdateDrillStatusCommand command) {
        long updated = queryFactory.update(externalIntegrationActivationPolicyEntity)
                .set(externalIntegrationActivationPolicyEntity.lastDrillOutcome, command.lastDrillOutcome())
                .set(externalIntegrationActivationPolicyEntity.lastDrillSummary, command.lastDrillSummary())
                .set(externalIntegrationActivationPolicyEntity.lastDrillAt, command.lastDrillAt())
                .set(externalIntegrationActivationPolicyEntity.updatedAt, OffsetDateTime.now())
                .set(externalIntegrationActivationPolicyEntity.updatedBy, command.actorUserId())
                .where(
                        externalIntegrationActivationPolicyEntity.centerId.eq(command.centerId()),
                        externalIntegrationActivationPolicyEntity.isDeleted.isFalse()
                )
                .execute();
        if (updated == 0) {
            return Optional.empty();
        }
        entityManager.clear();
        return jpaRepository.findByCenterIdAndIsDeletedFalse(command.centerId()).map(this::toDomain);
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
}
