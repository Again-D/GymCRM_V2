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
        boolean isActive,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
