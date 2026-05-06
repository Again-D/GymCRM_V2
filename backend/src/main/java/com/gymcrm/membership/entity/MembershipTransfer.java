package com.gymcrm.membership.entity;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record MembershipTransfer(
        Long membershipTransferId,
        Long centerId,
        Long transferorMembershipId,
        Long transfereeMembershipId,
        Long transferorMemberId,
        Long transfereeMemberId,
        Long transferFeePaymentId,
        String reason,
        String memo,
        OffsetDateTime transferredAt,
        OffsetDateTime createdAt,
        Long createdBy,
        OffsetDateTime updatedAt,
        Long updatedBy
) {
}
