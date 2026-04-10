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
    public LocalDate periodStart() {
        return LocalDate.of(settlementYear, settlementMonth, 1);
    }

    public LocalDate periodEnd() {
        return periodStart().withDayOfMonth(periodStart().lengthOfMonth());
    }

    public String scopeType() {
        return "ALL";
    }

    public Long scopeTrainerUserId() {
        return null;
    }
}
