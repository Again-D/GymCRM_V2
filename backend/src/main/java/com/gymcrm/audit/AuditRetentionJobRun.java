package com.gymcrm.audit;

import java.time.OffsetDateTime;

public record AuditRetentionJobRun(
        Long auditRetentionJobRunId,
        String jobName,
        String status,
        OffsetDateTime startedAt,
        OffsetDateTime completedAt,
        String detailsJson,
        Long createdBy,
        OffsetDateTime createdAt
) {
}
