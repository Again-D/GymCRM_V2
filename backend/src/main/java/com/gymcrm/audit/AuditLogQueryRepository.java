package com.gymcrm.audit;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.springframework.stereotype.Repository;

import java.util.List;

import static com.gymcrm.audit.QAuditLogEntity.auditLogEntity;

@Repository
public class AuditLogQueryRepository {
    private final JPAQueryFactory queryFactory;

    public AuditLogQueryRepository(JPAQueryFactory queryFactory) {
        this.queryFactory = queryFactory;
    }

    public List<AuditLog> findRecent(Long centerId, String eventType, int limit) {
        BooleanExpression predicate = auditLogEntity.centerId.eq(centerId);
        if (eventType != null) {
            predicate = predicate.and(auditLogEntity.eventType.eq(eventType));
        }
        return queryFactory.selectFrom(auditLogEntity)
                .where(predicate)
                .orderBy(auditLogEntity.createdAt.desc(), auditLogEntity.auditLogId.desc())
                .limit(limit)
                .fetch()
                .stream()
                .map(this::toDomain)
                .toList();
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
}
