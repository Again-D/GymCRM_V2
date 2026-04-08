package com.gymcrm.settlement.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record Settlement(
        Long settlementId,
        Long centerId,
        int settlementYear,
        int settlementMonth,
        int totalLessonCount,
        BigDecimal totalAmount,
        String status,
        LocalDate settlementDate,
        Long confirmedBy,
        OffsetDateTime confirmedAt,
        OffsetDateTime createdAt,
        Long createdBy,
        OffsetDateTime updatedAt,
        Long updatedBy
) {
}
