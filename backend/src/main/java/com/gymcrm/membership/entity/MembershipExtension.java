package com.gymcrm.membership.entity;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record MembershipExtension(
        Long membershipExtensionId,
        Long centerId,
        Long membershipId,
        LocalDate originalEndDate,
        LocalDate newEndDate,
        Integer extensionDays,
        Long extensionPaymentId,
        String reason,
        String memo,
        OffsetDateTime extendedAt,
        OffsetDateTime createdAt,
        Long createdBy,
        OffsetDateTime updatedAt,
        Long updatedBy
) {
}
