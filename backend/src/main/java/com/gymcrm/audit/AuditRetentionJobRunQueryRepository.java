package com.gymcrm.audit;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.springframework.stereotype.Repository;

import java.util.List;

import static com.gymcrm.audit.QAuditRetentionJobRunEntity.auditRetentionJobRunEntity;

@Repository
public class AuditRetentionJobRunQueryRepository {
    private final JPAQueryFactory queryFactory;

    public AuditRetentionJobRunQueryRepository(JPAQueryFactory queryFactory) {
        this.queryFactory = queryFactory;
    }

    public List<AuditRetentionJobRun> findRecent(String jobName, int limit) {
        BooleanExpression predicate = auditRetentionJobRunEntity.auditRetentionJobRunId.isNotNull();
        if (jobName != null) {
            predicate = predicate.and(auditRetentionJobRunEntity.jobName.eq(jobName));
        }
        return queryFactory.selectFrom(auditRetentionJobRunEntity)
                .where(predicate)
                .orderBy(auditRetentionJobRunEntity.completedAt.desc(), auditRetentionJobRunEntity.auditRetentionJobRunId.desc())
                .limit(limit)
                .fetch()
                .stream()
                .map(this::toDomain)
                .toList();
    }

    private AuditRetentionJobRun toDomain(AuditRetentionJobRunEntity entity) {
        return new AuditRetentionJobRun(
                entity.getAuditRetentionJobRunId(),
                entity.getJobName(),
                entity.getStatus(),
                entity.getStartedAt(),
                entity.getCompletedAt(),
                entity.getDetailsJson(),
                entity.getCreatedBy(),
                entity.getCreatedAt()
        );
    }
}
