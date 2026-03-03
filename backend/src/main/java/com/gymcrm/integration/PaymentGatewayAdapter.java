package com.gymcrm.integration;

import java.math.BigDecimal;
import java.util.Map;

public interface PaymentGatewayAdapter {
    ApproveResult approve(ApproveRequest request);

    CancelResult cancel(CancelRequest request);

    record ApproveRequest(
            Long centerId,
            Long memberId,
            String orderId,
            BigDecimal amount,
            String paymentMethod,
            Map<String, String> attributes
    ) {
    }

    record ApproveResult(
            String provider,
            String providerTransactionId,
            String approvedAt
    ) {
    }

    record CancelRequest(
            Long centerId,
            String providerTransactionId,
            BigDecimal cancelAmount,
            String reason,
            Map<String, String> attributes
    ) {
    }

    record CancelResult(
            String provider,
            String canceledAt,
            String cancelId
    ) {
    }
}
