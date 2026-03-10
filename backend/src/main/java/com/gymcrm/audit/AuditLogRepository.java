package com.gymcrm.audit;

import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public class AuditLogRepository {
    private final AuditLogJpaRepository auditLogJpaRepository;
    private final AuditLogQueryRepository auditLogQueryRepository;
    private final EntityManager entityManager;

    public AuditLogRepository(
            AuditLogJpaRepository auditLogJpaRepository,
            AuditLogQueryRepository auditLogQueryRepository,
            EntityManager entityManager
    ) {
        this.auditLogJpaRepository = auditLogJpaRepository;
        this.auditLogQueryRepository = auditLogQueryRepository;
        this.entityManager = entityManager;
    }

    @Transactional
    public AuditLog insert(InsertCommand command) {
        AuditLogEntity entity = new AuditLogEntity();
        entity.setCenterId(command.centerId());
        entity.setEventType(command.eventType());
        entity.setActorUserId(command.actorUserId());
        entity.setResourceType(command.resourceType());
        entity.setResourceId(command.resourceId());
        entity.setEventAt(command.eventAt());
        entity.setTraceId(command.traceId());
        entity.setAttributesJson(command.attributesJson());
        entity.setCreatedAt(command.eventAt());
        AuditLogEntity saved = auditLogJpaRepository.saveAndFlush(entity);
        entityManager.refresh(saved);
        return toDomain(saved);
    }

    public List<AuditLog> findRecent(Long centerId, String eventType, int limit) {
        entityManager.clear();
        return auditLogQueryRepository.findRecent(centerId, eventType, limit);
    }

    private AuditLog toDomain(AuditLogEntity entity) {
        return new AuditLog(
                entity.getAuditLogId(),
                entity.getCenterId(),
                entity.getEventType(),
                entity.getActorUserId(),
                entity.getResourceType(),
                entity.getResourceId(),
                entity.getEventAt(),
                entity.getTraceId(),
                entity.getAttributesJson(),
                entity.getCreatedAt()
        );
    }

    public record InsertCommand(
            Long centerId,
            String eventType,
            Long actorUserId,
            String resourceType,
            String resourceId,
            java.time.OffsetDateTime eventAt,
            String traceId,
            String attributesJson
    ) {
    }
}
