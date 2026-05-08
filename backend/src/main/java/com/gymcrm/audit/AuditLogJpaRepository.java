package com.gymcrm.audit;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;

public interface AuditLogJpaRepository extends JpaRepository<AuditLogEntity, Long> {

    @Query("SELECT a.auditLogId FROM AuditLogEntity a WHERE a.eventAt < :cutoff ORDER BY a.auditLogId ASC LIMIT :limit")
    List<Long> findIdsBefore(@Param("cutoff") OffsetDateTime cutoff, @Param("limit") int limit);

    @Modifying
    @Query("DELETE FROM AuditLogEntity a WHERE a.auditLogId IN :ids")
    int deleteByIds(@Param("ids") List<Long> ids);
}
