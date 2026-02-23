package com.gymcrm.membership;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record Payment(
        Long paymentId,
        Long centerId,
        Long memberId,
        Long membershipId,
        String paymentType,
        String paymentStatus,
        String paymentMethod,
        BigDecimal amount,
        OffsetDateTime paidAt,
        String approvalRef,
        String memo,
        OffsetDateTime createdAt,
        Long createdBy,
        OffsetDateTime updatedAt,
        Long updatedBy
) {
}
