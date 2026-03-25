package com.gymcrm.membership.repository;

import com.gymcrm.membership.entity.MembershipRefund;
import com.gymcrm.membership.enums.RefundStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
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
                .query((rs, rowNum) -> toDomain(rs))
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
                .query((rs, rowNum) -> toDomain(rs))
                .single();
    }

    private MembershipRefund toDomain(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new MembershipRefund(
                rs.getLong("membership_refund_id"),
                rs.getLong("center_id"),
                rs.getLong("membership_id"),
                rs.getLong("refund_payment_id"),
                RefundStatus.from(rs.getString("refund_status")),
                rs.getString("refund_reason"),
                rs.getObject("requested_at", OffsetDateTime.class),
                rs.getObject("processed_at", OffsetDateTime.class),
                rs.getObject("original_amount", BigDecimal.class),
                rs.getObject("used_amount", BigDecimal.class),
                rs.getObject("penalty_amount", BigDecimal.class),
                rs.getObject("refund_amount", BigDecimal.class),
                rs.getString("memo"),
                rs.getObject("created_at", OffsetDateTime.class),
                rs.getObject("created_by", Long.class),
                rs.getObject("updated_at", OffsetDateTime.class),
                rs.getObject("updated_by", Long.class)
        );
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
