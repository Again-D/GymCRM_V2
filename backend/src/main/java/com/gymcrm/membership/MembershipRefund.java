package com.gymcrm.membership;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record MembershipRefund(
        Long membershipRefundId,
        Long centerId,
        Long membershipId,
        Long refundPaymentId,
        String refundStatus,
        String refundReason,
        OffsetDateTime requestedAt,
        OffsetDateTime processedAt,
        BigDecimal originalAmount,
        BigDecimal usedAmount,
        BigDecimal penaltyAmount,
        BigDecimal refundAmount,
        String memo,
        OffsetDateTime createdAt,
        Long createdBy,
        OffsetDateTime updatedAt,
        Long updatedBy
) {
}
