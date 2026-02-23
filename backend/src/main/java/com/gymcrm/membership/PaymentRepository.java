package com.gymcrm.membership;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class PaymentRepository {
    private final JdbcClient jdbcClient;

    public PaymentRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public Payment insert(PaymentCreateCommand command) {
        return jdbcClient.sql("""
                INSERT INTO payments (
                    center_id, member_id, membership_id,
                    payment_type, payment_status, payment_method,
                    amount, paid_at, approval_ref, memo,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :memberId, :membershipId,
                    :paymentType, :paymentStatus, :paymentMethod,
                    :amount, :paidAt, :approvalRef, :memo,
                    :actorUserId, :actorUserId
                )
                RETURNING
                    payment_id, center_id, member_id, membership_id,
                    payment_type, payment_status, payment_method,
                    amount, paid_at, approval_ref, memo,
                    created_at, created_by, updated_at, updated_by
                """)
                .paramSource(command)
                .query(Payment.class)
                .single();
    }

    public Optional<Payment> findLatestCompletedPurchaseByMembershipId(Long membershipId) {
        return jdbcClient.sql("""
                SELECT
                    payment_id, center_id, member_id, membership_id,
                    payment_type, payment_status, payment_method,
                    amount, paid_at, approval_ref, memo,
                    created_at, created_by, updated_at, updated_by
                FROM payments
                WHERE membership_id = :membershipId
                  AND payment_type = 'PURCHASE'
                  AND payment_status = 'COMPLETED'
                  AND is_deleted = FALSE
                ORDER BY payment_id DESC
                LIMIT 1
                """)
                .param("membershipId", membershipId)
                .query(Payment.class)
                .optional();
    }

    public record PaymentCreateCommand(
            Long centerId,
            Long memberId,
            Long membershipId,
            String paymentType,
            String paymentStatus,
            String paymentMethod,
            java.math.BigDecimal amount,
            java.time.OffsetDateTime paidAt,
            String approvalRef,
            String memo,
            Long actorUserId
    ) {}
}
