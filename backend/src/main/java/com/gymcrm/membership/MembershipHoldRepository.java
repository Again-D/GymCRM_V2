package com.gymcrm.membership;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Optional;

@Repository
public class MembershipHoldRepository {
    private final JdbcClient jdbcClient;

    public MembershipHoldRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public MembershipHold insert(MembershipHoldCreateCommand command) {
        return jdbcClient.sql("""
                INSERT INTO membership_holds (
                    center_id, membership_id, hold_status,
                    hold_start_date, hold_end_date, reason, memo,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :membershipId, :holdStatus,
                    :holdStartDate, :holdEndDate, :reason, :memo,
                    :actorUserId, :actorUserId
                )
                RETURNING
                    membership_hold_id, center_id, membership_id, hold_status,
                    hold_start_date, hold_end_date, resumed_at, actual_hold_days,
                    reason, memo,
                    created_at, created_by, updated_at, updated_by
                """)
                .paramSource(command)
                .query(MembershipHold.class)
                .single();
    }

    public Optional<MembershipHold> findActiveByMembershipId(Long membershipId) {
        return jdbcClient.sql("""
                SELECT
                    membership_hold_id, center_id, membership_id, hold_status,
                    hold_start_date, hold_end_date, resumed_at, actual_hold_days,
                    reason, memo,
                    created_at, created_by, updated_at, updated_by
                FROM membership_holds
                WHERE membership_id = :membershipId
                  AND hold_status = 'ACTIVE'
                  AND is_deleted = FALSE
                ORDER BY membership_hold_id DESC
                LIMIT 1
                """)
                .param("membershipId", membershipId)
                .query(MembershipHold.class)
                .optional();
    }

    public MembershipHold markResumed(MembershipHoldResumeCommand command) {
        return jdbcClient.sql("""
                UPDATE membership_holds
                SET
                    hold_status = 'RESUMED',
                    resumed_at = :resumedAt,
                    actual_hold_days = :actualHoldDays,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = :actorUserId
                WHERE membership_hold_id = :membershipHoldId
                  AND hold_status = 'ACTIVE'
                  AND is_deleted = FALSE
                RETURNING
                    membership_hold_id, center_id, membership_id, hold_status,
                    hold_start_date, hold_end_date, resumed_at, actual_hold_days,
                    reason, memo,
                    created_at, created_by, updated_at, updated_by
                """)
                .paramSource(command)
                .query(MembershipHold.class)
                .single();
    }

    public record MembershipHoldCreateCommand(
            Long centerId,
            Long membershipId,
            String holdStatus,
            LocalDate holdStartDate,
            LocalDate holdEndDate,
            String reason,
            String memo,
            Long actorUserId
    ) {}

    public record MembershipHoldResumeCommand(
            Long membershipHoldId,
            OffsetDateTime resumedAt,
            Integer actualHoldDays,
            Long actorUserId
    ) {}
}
