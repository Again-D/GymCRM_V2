package com.gymcrm.audit;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Service
public class AuditLogRetentionScheduler {
    private static final Logger log = LoggerFactory.getLogger(AuditLogRetentionScheduler.class);
    static final String JOB_NAME = "audit_log_retention";

    private final AuditLogRepository auditLogRepository;
    private final AuditLogService auditLogService;
    private final AuditLogRetentionSchedulerActorGuard actorGuard;
    private final ObjectMapper objectMapper;
    private final boolean retentionEnabled;
    private final int retentionDays;

    public AuditLogRetentionScheduler(
            AuditLogRepository auditLogRepository,
            AuditLogService auditLogService,
            AuditLogRetentionSchedulerActorGuard actorGuard,
            ObjectMapper objectMapper,
            @Value("${app.audit.retention.enabled:false}") boolean retentionEnabled,
            @Value("${app.audit.retention.days:365}") int retentionDays
    ) {
        this.auditLogRepository = auditLogRepository;
        this.auditLogService = auditLogService;
        this.actorGuard = actorGuard;
        this.objectMapper = objectMapper;
        this.retentionEnabled = retentionEnabled;
        this.retentionDays = retentionDays;
    }

    @Scheduled(cron = "${app.audit.retention.cron:0 0 3 * * *}")
    @Transactional
    public void runRetention() {
        if (!retentionEnabled) {
            log.debug("Skipping audit log retention: feature flag disabled");
            return;
        }

        OffsetDateTime startedAt = OffsetDateTime.now(ZoneOffset.UTC);
        Long actorUserId = actorGuard.schedulerActorUserId();
        OffsetDateTime cutoff = startedAt.minusDays(retentionDays);

        log.info("Starting audit log retention: cutoff={}, retentionDays={}", cutoff, retentionDays);

        int deletedCount = 0;
        String status;
        String detailsJson;

        try {
            deletedCount = auditLogRepository.deleteOlderThan(cutoff);
            status = "SUCCESS";
            detailsJson = buildDetailsJson(retentionDays, cutoff, deletedCount, null);
            log.info("Completed audit log retention: deleted={}, cutoff={}", deletedCount, cutoff);
        } catch (Exception ex) {
            status = "FAILED";
            detailsJson = buildDetailsJson(retentionDays, cutoff, deletedCount, ex.getMessage());
            log.error("Audit log retention failed: cutoff={}", cutoff, ex);
        }

        auditLogService.recordRetentionJobRun(
                JOB_NAME,
                status,
                startedAt,
                OffsetDateTime.now(ZoneOffset.UTC),
                detailsJson,
                actorUserId
        );
    }

    private String buildDetailsJson(int retentionDays, OffsetDateTime cutoff, int deletedCount, String errorMessage) {
        try {
            return objectMapper.writeValueAsString(
                    new RetentionRunDetails(retentionDays, cutoff.toString(), deletedCount, errorMessage)
            );
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize audit log retention run details", ex);
        }
    }

    private record RetentionRunDetails(
            int retentionDays,
            String cutoff,
            int deletedCount,
            String errorMessage
    ) {
    }
}
