package com.gymcrm.audit;

import jakarta.persistence.EntityManager;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Repository
public class AuditLogRepository {
    private final AuditLogJpaRepository auditLogJpaRepository;
    private final AuditLogQueryRepository auditLogQueryRepository;
    private final EntityManager entityManager;
    private final int deletionChunkSize;

    public AuditLogRepository(
            AuditLogJpaRepository auditLogJpaRepository,
            AuditLogQueryRepository auditLogQueryRepository,
            EntityManager entityManager,
            @Value("${app.audit.retention.chunk-size:1000}") int deletionChunkSize
    ) {
        this.auditLogJpaRepository = auditLogJpaRepository;
        this.auditLogQueryRepository = auditLogQueryRepository;
        this.entityManager = entityManager;
        this.deletionChunkSize = deletionChunkSize;
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

    @Transactional
    public int deleteOlderThan(OffsetDateTime cutoff) {
        int effectiveChunkSize = Math.max(1, deletionChunkSize);
        int totalDeleted = 0;
        List<Long> ids;
        do {
            ids = auditLogJpaRepository.findIdsBefore(cutoff, effectiveChunkSize);
            if (ids.isEmpty()) {
                break;
            }
            totalDeleted += auditLogJpaRepository.deleteByIds(ids);
        } while (ids.size() == effectiveChunkSize);
        return totalDeleted;
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
