package com.gymcrm.crm.dto.response;

import java.time.OffsetDateTime;

import com.gymcrm.crm.entity.CrmMessageEvent;

public record HistoryRowResponse(
            Long crmMessageEventId,
            Long memberId,
            Long membershipId,
            String eventType,
            String channelType,
            String sendStatus,
            Integer attemptCount,
            OffsetDateTime lastAttemptedAt,
            OffsetDateTime nextAttemptAt,
            OffsetDateTime sentAt,
            OffsetDateTime failedAt,
            String lastErrorMessage,
            String traceId,
            OffsetDateTime createdAt
    ) {
        public static HistoryRowResponse from(CrmMessageEvent event) {
            return new HistoryRowResponse(
                    event.crmMessageEventId(),
                    event.memberId(),
                    event.membershipId(),
                    event.eventType(),
                    event.channelType(),
                    event.sendStatus(),
                    event.attemptCount(),
                    event.lastAttemptedAt(),
                    event.nextAttemptAt(),
                    event.sentAt(),
                    event.failedAt(),
                    event.lastErrorMessage(),
                    event.traceId(),
                    event.createdAt()
            );
        }
    }
