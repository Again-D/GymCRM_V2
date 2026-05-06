package com.gymcrm.membership.repository;

import com.gymcrm.membership.entity.MembershipTransfer;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Optional;

@Repository
public class MembershipTransferRepository {
    private final JdbcClient jdbcClient;

    public MembershipTransferRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public Optional<MembershipTransfer> findByTransferorMembershipId(Long membershipId) {
        return jdbcClient.sql("""
                SELECT
                    membership_transfer_id, center_id,
                    transferor_membership_id, transferee_membership_id,
                    transferor_member_id, transferee_member_id,
                    transfer_fee_payment_id,
                    reason, memo, transferred_at,
                    created_at, created_by, updated_at, updated_by
                FROM membership_transfers
                WHERE transferor_membership_id = :membershipId
                ORDER BY membership_transfer_id DESC
                LIMIT 1
                """)
                .param("membershipId", membershipId)
                .query((rs, rowNum) -> toDomain(rs))
                .optional();
    }

    public MembershipTransfer insert(MembershipTransferCreateCommand command) {
        return jdbcClient.sql("""
                INSERT INTO membership_transfers (
                    center_id,
                    transferor_membership_id, transferee_membership_id,
                    transferor_member_id, transferee_member_id,
                    transfer_fee_payment_id,
                    reason, memo, transferred_at,
                    created_by, updated_by
                )
                VALUES (
                    :centerId,
                    :transferorMembershipId, :transfereeMembershipId,
                    :transferorMemberId, :transfereeMemberId,
                    :transferFeePaymentId,
                    :reason, :memo, CURRENT_TIMESTAMP,
                    :actorUserId, :actorUserId
                )
                RETURNING
                    membership_transfer_id, center_id,
                    transferor_membership_id, transferee_membership_id,
                    transferor_member_id, transferee_member_id,
                    transfer_fee_payment_id,
                    reason, memo, transferred_at,
                    created_at, created_by, updated_at, updated_by
                """)
                .paramSource(command)
                .query((rs, rowNum) -> toDomain(rs))
                .single();
    }

    private MembershipTransfer toDomain(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new MembershipTransfer(
                rs.getLong("membership_transfer_id"),
                rs.getLong("center_id"),
                rs.getLong("transferor_membership_id"),
                rs.getLong("transferee_membership_id"),
                rs.getLong("transferor_member_id"),
                rs.getLong("transferee_member_id"),
                rs.getObject("transfer_fee_payment_id", Long.class),
                rs.getString("reason"),
                rs.getString("memo"),
                rs.getObject("transferred_at", OffsetDateTime.class),
                rs.getObject("created_at", OffsetDateTime.class),
                rs.getObject("created_by", Long.class),
                rs.getObject("updated_at", OffsetDateTime.class),
                rs.getObject("updated_by", Long.class)
        );
    }

    public record MembershipTransferCreateCommand(
            Long centerId,
            Long transferorMembershipId,
            Long transfereeMembershipId,
            Long transferorMemberId,
            Long transfereeMemberId,
            Long transferFeePaymentId,
            String reason,
            String memo,
            Long actorUserId
    ) {}
}
