package com.gymcrm.audit;

import java.time.OffsetDateTime;

public record AuditLog(
        Long auditLogId,
        Long centerId,
        String eventType,
        Long actorUserId,
        String resourceType,
        String resourceId,
        OffsetDateTime eventAt,
        String traceId,
        String attributesJson,
        OffsetDateTime createdAt
) {
}
