package com.gymcrm.audit;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;

public interface AuditLogJpaRepository extends JpaRepository<AuditLogEntity, Long> {
    int deleteByEventAtBefore(OffsetDateTime cutoff);
}
