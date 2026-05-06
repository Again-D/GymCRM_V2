package com.gymcrm.membership.repository;

import com.gymcrm.membership.entity.MembershipExtension;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Optional;

@Repository
public class MembershipExtensionRepository {
    private final JdbcClient jdbcClient;

    public MembershipExtensionRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public Optional<MembershipExtension> findByMembershipId(Long membershipId) {
        return jdbcClient.sql("""
                SELECT
                    membership_extension_id, center_id,
                    membership_id, original_end_date, new_end_date,
                    extension_days, extension_payment_id,
                    reason, memo, extended_at,
                    created_at, created_by, updated_at, updated_by
                FROM membership_extensions
                WHERE membership_id = :membershipId
                ORDER BY membership_extension_id DESC
                LIMIT 1
                """)
                .param("membershipId", membershipId)
                .query((rs, rowNum) -> toDomain(rs))
                .optional();
    }

    public MembershipExtension insert(MembershipExtensionCreateCommand command) {
        return jdbcClient.sql("""
                INSERT INTO membership_extensions (
                    center_id,
                    membership_id, original_end_date, new_end_date,
                    extension_days, extension_payment_id,
                    reason, memo, extended_at,
                    created_by, updated_by
                )
                VALUES (
                    :centerId,
                    :membershipId, :originalEndDate, :newEndDate,
                    :extensionDays, :extensionPaymentId,
                    :reason, :memo, CURRENT_TIMESTAMP,
                    :actorUserId, :actorUserId
                )
                RETURNING
                    membership_extension_id, center_id,
                    membership_id, original_end_date, new_end_date,
                    extension_days, extension_payment_id,
                    reason, memo, extended_at,
                    created_at, created_by, updated_at, updated_by
                """)
                .paramSource(command)
                .query((rs, rowNum) -> toDomain(rs))
                .single();
    }

    private MembershipExtension toDomain(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new MembershipExtension(
                rs.getLong("membership_extension_id"),
                rs.getLong("center_id"),
                rs.getLong("membership_id"),
                rs.getObject("original_end_date", LocalDate.class),
                rs.getObject("new_end_date", LocalDate.class),
                rs.getInt("extension_days"),
                rs.getLong("extension_payment_id"),
                rs.getString("reason"),
                rs.getString("memo"),
                rs.getObject("extended_at", OffsetDateTime.class),
                rs.getObject("created_at", OffsetDateTime.class),
                rs.getObject("created_by", Long.class),
                rs.getObject("updated_at", OffsetDateTime.class),
                rs.getObject("updated_by", Long.class)
        );
    }

    public record MembershipExtensionCreateCommand(
            Long centerId,
            Long membershipId,
            LocalDate originalEndDate,
            LocalDate newEndDate,
            Integer extensionDays,
            Long extensionPaymentId,
            String reason,
            String memo,
            Long actorUserId
    ) {}
}
