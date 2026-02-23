package com.gymcrm.membership;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record MemberMembership(
        Long membershipId,
        Long centerId,
        Long memberId,
        Long productId,
        String membershipStatus,
        String productNameSnapshot,
        String productCategorySnapshot,
        String productTypeSnapshot,
        BigDecimal priceAmountSnapshot,
        OffsetDateTime purchasedAt,
        LocalDate startDate,
        LocalDate endDate,
        Integer totalCount,
        Integer remainingCount,
        Integer usedCount,
        Integer holdDaysUsed,
        Integer holdCountUsed,
        String memo,
        OffsetDateTime createdAt,
        Long createdBy,
        OffsetDateTime updatedAt,
        Long updatedBy
) {
}
