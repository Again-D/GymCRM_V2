package com.gymcrm.audit;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.logging.TraceIdFilter;
import com.gymcrm.common.security.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service
public class AuditLogService {
    private final AuditLogRepository auditLogRepository;
    private final AuditRetentionJobRunRepository retentionJobRunRepository;
    private final CurrentUserProvider currentUserProvider;

    public AuditLogService(
            AuditLogRepository auditLogRepository,
            AuditRetentionJobRunRepository retentionJobRunRepository,
            CurrentUserProvider currentUserProvider
    ) {
        this.auditLogRepository = auditLogRepository;
        this.retentionJobRunRepository = retentionJobRunRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional
    public AuditLog recordPiiRead(String resourceType, String resourceId, String attributesJson) {
        return recordEvent("PII_READ", resourceType, resourceId, attributesJson);
    }

    @Transactional
    public AuditLog recordEvent(String eventType, String resourceType, String resourceId, String attributesJson) {
        String normalizedType = normalizeEventType(eventType);
        return auditLogRepository.insert(new AuditLogRepository.InsertCommand(
                currentUserProvider.currentCenterId(),
                normalizedType,
                currentUserProvider.currentUserId(),
                resourceType,
                resourceId,
                OffsetDateTime.now(ZoneOffset.UTC),
                TraceIdFilter.currentTraceIdOrGenerate(),
                attributesJson
        ));
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getRecentLogs(String eventType, Integer limit) {
        int bounded = limit == null ? 100 : limit;
        if (bounded < 1 || bounded > 500) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "limit must be between 1 and 500");
        }
        String normalizedType = normalizeEventType(eventType);
        return auditLogRepository.findRecent(currentUserProvider.currentCenterId(), normalizedType, bounded);
    }

    @Transactional
    public AuditRetentionJobRun recordRetentionJobRun(
            String jobName,
            String status,
            OffsetDateTime startedAt,
            OffsetDateTime completedAt,
            String detailsJson
    ) {
        if (jobName == null || jobName.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "jobName is required");
        }
        String normalizedStatus = normalizeRetentionStatus(status);
        OffsetDateTime start = startedAt == null ? OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(1) : startedAt;
        OffsetDateTime end = completedAt == null ? OffsetDateTime.now(ZoneOffset.UTC) : completedAt;
        if (end.isBefore(start)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "completedAt must be after startedAt");
        }
        return retentionJobRunRepository.insert(new AuditRetentionJobRunRepository.InsertCommand(
                jobName.trim(),
                normalizedStatus,
                start,
                end,
                detailsJson,
                currentUserProvider.currentUserId()
        ));
    }

    @Transactional(readOnly = true)
    public List<AuditRetentionJobRun> getRecentRetentionRuns(String jobName, Integer limit) {
        int bounded = limit == null ? 50 : limit;
        if (bounded < 1 || bounded > 200) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "limit must be between 1 and 200");
        }
        String normalizedJobName = jobName == null || jobName.isBlank() ? null : jobName.trim();
        return retentionJobRunRepository.findRecent(normalizedJobName, bounded);
    }

    private String normalizeEventType(String eventType) {
        if (eventType == null || eventType.isBlank()) {
            return null;
        }
        String normalized = eventType.trim().toUpperCase();
        if (!normalized.equals("PII_READ")
                && !normalized.equals("MEMBERSHIP_REFUND")
                && !normalized.equals("ACCOUNT_ROLE_CHANGE")
                && !normalized.equals("ACCOUNT_ACCESS_REVOKE")) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "eventType is invalid");
        }
        return normalized;
    }

    private String normalizeRetentionStatus(String status) {
        if (status == null || status.isBlank()) {
            return "SUCCESS";
        }
        String normalized = status.trim().toUpperCase();
        if (!normalized.equals("SUCCESS") && !normalized.equals("FAILED") && !normalized.equals("PARTIAL")) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "status is invalid");
        }
        return normalized;
    }
}
