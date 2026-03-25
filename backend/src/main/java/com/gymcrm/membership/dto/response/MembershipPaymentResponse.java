package com.gymcrm.membership.dto.response;

import com.gymcrm.settlement.entity.Payment;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record MembershipPaymentResponse(
        Long paymentId,
        Long membershipId,
        String paymentType,
        String paymentStatus,
        String paymentMethod,
        BigDecimal amount,
        OffsetDateTime paidAt,
        String memo
) {
    public static MembershipPaymentResponse from(Payment payment) {
        return new MembershipPaymentResponse(
                payment.paymentId(),
                payment.membershipId(),
                payment.paymentType(),
                payment.paymentStatus(),
                payment.paymentMethod(),
                payment.amount(),
                payment.paidAt(),
                payment.memo()
        );
    }
}
