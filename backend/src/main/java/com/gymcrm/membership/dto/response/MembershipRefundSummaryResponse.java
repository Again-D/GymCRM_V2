package com.gymcrm.membership.dto.response;

import com.gymcrm.membership.entity.MembershipRefund;

import java.math.BigDecimal;

public record MembershipRefundSummaryResponse(
        Long membershipRefundId,
        Long centerId,
        Long membershipId,
        Long refundPaymentId,
        String refundStatus,
        String refundReason,
        BigDecimal originalAmount,
        BigDecimal usedAmount,
        BigDecimal penaltyAmount,
        BigDecimal refundAmount,
        String memo
) {
    public static MembershipRefundSummaryResponse from(MembershipRefund refund) {
        return new MembershipRefundSummaryResponse(
                refund.membershipRefundId(),
                refund.centerId(),
                refund.membershipId(),
                refund.refundPaymentId(),
                refund.refundStatus().name(),
                refund.refundReason(),
                refund.originalAmount(),
                refund.usedAmount(),
                refund.penaltyAmount(),
                refund.refundAmount(),
                refund.memo()
        );
    }
}
