package com.gymcrm.crm.entity;

import java.time.OffsetDateTime;

public record CrmMessageTemplate(
        Long templateId,
        Long centerId,
        String templateCode,
        String templateName,
        String channelType,
        String templateType,
        String templateBody,
        String reviewStatus,
        String operationalStatus,
        boolean sendable,
        boolean isActive,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public boolean isSendable() {
        return sendable;
    }
}
