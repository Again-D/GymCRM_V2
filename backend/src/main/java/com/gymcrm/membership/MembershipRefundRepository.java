package com.gymcrm.membership;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class MembershipRefundRepository {
    private final JdbcClient jdbcClient;

    public MembershipRefundRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public Optional<MembershipRefund> findByMembershipId(Long membershipId) {
        return jdbcClient.sql("""
                SELECT
                    membership_refund_id, center_id, membership_id, refund_payment_id,
                    refund_status, refund_reason, requested_at, processed_at,
                    original_amount, used_amount, penalty_amount, refund_amount,
                    memo,
                    created_at, created_by, updated_at, updated_by
                FROM membership_refunds
                WHERE membership_id = :membershipId
                  AND is_deleted = FALSE
                ORDER BY membership_refund_id DESC
                LIMIT 1
                """)
                .param("membershipId", membershipId)
                .query(MembershipRefund.class)
                .optional();
    }

    public MembershipRefund insert(MembershipRefundCreateCommand command) {
        return jdbcClient.sql("""
                INSERT INTO membership_refunds (
                    center_id, membership_id, refund_payment_id,
                    refund_status, refund_reason, requested_at, processed_at,
                    original_amount, used_amount, penalty_amount, refund_amount, memo,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :membershipId, :refundPaymentId,
                    :refundStatus, :refundReason, :requestedAt, :processedAt,
                    :originalAmount, :usedAmount, :penaltyAmount, :refundAmount, :memo,
                    :actorUserId, :actorUserId
                )
                RETURNING
                    membership_refund_id, center_id, membership_id, refund_payment_id,
                    refund_status, refund_reason, requested_at, processed_at,
                    original_amount, used_amount, penalty_amount, refund_amount,
                    memo,
                    created_at, created_by, updated_at, updated_by
                """)
                .paramSource(command)
                .query(MembershipRefund.class)
                .single();
    }

    public record MembershipRefundCreateCommand(
            Long centerId,
            Long membershipId,
            Long refundPaymentId,
            String refundStatus,
            String refundReason,
            java.time.OffsetDateTime requestedAt,
            java.time.OffsetDateTime processedAt,
            java.math.BigDecimal originalAmount,
            java.math.BigDecimal usedAmount,
            java.math.BigDecimal penaltyAmount,
            java.math.BigDecimal refundAmount,
            String memo,
            Long actorUserId
    ) {}
}
