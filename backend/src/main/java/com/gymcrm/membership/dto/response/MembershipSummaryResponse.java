package com.gymcrm.membership.dto.response;

import com.gymcrm.membership.entity.MemberMembership;
import com.gymcrm.membership.entity.MembershipHold;
import com.gymcrm.membership.service.MembershipPurchaseService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record MembershipSummaryResponse(
        Long membershipId,
        Long centerId,
        Long memberId,
        Long productId,
        Long assignedTrainerId,
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
        String activeHoldStatus,
        LocalDate activeHoldStartDate,
        LocalDate activeHoldEndDate
) {
    public static MembershipSummaryResponse from(MembershipPurchaseService.MembershipListItem item) {
        return from(item.membership(), item.activeHold());
    }

    public static MembershipSummaryResponse from(MemberMembership membership) {
        return from(membership, null);
    }

    public static MembershipSummaryResponse from(MemberMembership membership, MembershipHold activeHold) {
        return new MembershipSummaryResponse(
                membership.membershipId(),
                membership.centerId(),
                membership.memberId(),
                membership.productId(),
                membership.assignedTrainerId(),
                membership.membershipStatus(),
                membership.productNameSnapshot(),
                membership.productCategorySnapshot(),
                membership.productTypeSnapshot(),
                membership.priceAmountSnapshot(),
                membership.purchasedAt(),
                membership.startDate(),
                membership.endDate(),
                membership.totalCount(),
                membership.remainingCount(),
                membership.usedCount(),
                membership.holdDaysUsed(),
                membership.holdCountUsed(),
                membership.memo(),
                activeHold == null ? null : activeHold.holdStatus().name(),
                activeHold == null ? null : activeHold.holdStartDate(),
                activeHold == null ? null : activeHold.holdEndDate()
        );
    }
}
