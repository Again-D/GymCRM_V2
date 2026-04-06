package com.gymcrm.settlement.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record TrainerSettlement(
        Long settlementId,
        Long centerId,
        LocalDate settlementMonth,
        Long trainerUserId,
        String trainerName,
        long completedClassCount,
        BigDecimal sessionUnitPrice,
        BigDecimal payrollAmount,
        String settlementStatus,
        OffsetDateTime confirmedAt,
        Long confirmedBy,
        OffsetDateTime createdAt,
        Long createdBy,
        OffsetDateTime updatedAt,
        Long updatedBy
) {
}
