package com.gymcrm.audit;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditRetentionJobRunJpaRepository extends JpaRepository<AuditRetentionJobRunEntity, Long> {
}
