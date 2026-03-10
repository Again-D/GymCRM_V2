package com.gymcrm.audit;

import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public class AuditRetentionJobRunRepository {
    private final AuditRetentionJobRunJpaRepository jpaRepository;
    private final AuditRetentionJobRunQueryRepository queryRepository;
    private final EntityManager entityManager;

    public AuditRetentionJobRunRepository(
            AuditRetentionJobRunJpaRepository jpaRepository,
            AuditRetentionJobRunQueryRepository queryRepository,
            EntityManager entityManager
    ) {
        this.jpaRepository = jpaRepository;
        this.queryRepository = queryRepository;
        this.entityManager = entityManager;
    }

    @Transactional
    public AuditRetentionJobRun insert(InsertCommand command) {
        AuditRetentionJobRunEntity entity = new AuditRetentionJobRunEntity();
        entity.setJobName(command.jobName());
        entity.setStatus(command.status());
        entity.setStartedAt(command.startedAt());
        entity.setCompletedAt(command.completedAt());
        entity.setDetailsJson(command.detailsJson());
        entity.setCreatedBy(command.createdBy());
        entity.setCreatedAt(command.completedAt());
        AuditRetentionJobRunEntity saved = jpaRepository.saveAndFlush(entity);
        entityManager.refresh(saved);
        return toDomain(saved);
    }

    public List<AuditRetentionJobRun> findRecent(String jobName, int limit) {
        entityManager.clear();
        return queryRepository.findRecent(jobName, limit);
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

    public record InsertCommand(
            String jobName,
            String status,
            java.time.OffsetDateTime startedAt,
            java.time.OffsetDateTime completedAt,
            String detailsJson,
            Long createdBy
    ) {
    }
}
