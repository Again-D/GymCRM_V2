package com.gymcrm.settlement.entity;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record SettlementDetail(
        Long settlementDetailId,
        Long settlementId,
        Long userId,
        String lessonType,
        int lessonCount,
        BigDecimal unitPrice,
        BigDecimal amount,
        BigDecimal bonusAmount,
        BigDecimal deductionAmount,
        BigDecimal netAmount,
        String memo,
        OffsetDateTime createdAt,
        Long createdBy,
        OffsetDateTime updatedAt,
        Long updatedBy
) {
}
