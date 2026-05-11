package com.gymcrm.crm.entity;

import java.time.OffsetDateTime;

public record CrmMessageEvent(
        Long crmMessageEventId,
        Long centerId,
        Long memberId,
        Long membershipId,
        String eventType,
        String channelType,
        String deliveryMode,
        String dedupeKey,
        String payloadJson,
        String sendStatus,
        Integer attemptCount,
        OffsetDateTime lastAttemptedAt,
        OffsetDateTime nextAttemptAt,
        OffsetDateTime sentAt,
        OffsetDateTime failedAt,
        String lastErrorMessage,
        String traceId,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
