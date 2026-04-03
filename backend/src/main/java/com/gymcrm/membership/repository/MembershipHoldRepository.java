package com.gymcrm.membership.repository;

import com.gymcrm.membership.entity.MembershipHold;
import com.gymcrm.membership.enums.HoldStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

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
                    override_limits, created_by, updated_by
                )
                VALUES (
                    :centerId, :membershipId, :holdStatus,
                    :holdStartDate, :holdEndDate, :reason, :memo,
                    :overrideLimits, :actorUserId, :actorUserId
                )
                RETURNING
                    membership_hold_id, center_id, membership_id, hold_status,
                    hold_start_date, hold_end_date, resumed_at, actual_hold_days,
                    reason, memo, override_limits,
                    created_at, created_by, updated_at, updated_by
                """)
                .paramSource(command)
                .query((rs, rowNum) -> toDomain(rs))
                .single();
    }

    public Optional<MembershipHold> findActiveByMembershipId(Long membershipId) {
        return jdbcClient.sql("""
                SELECT
                    membership_hold_id, center_id, membership_id, hold_status,
                    hold_start_date, hold_end_date, resumed_at, actual_hold_days,
                    reason, memo, override_limits,
                    created_at, created_by, updated_at, updated_by
                FROM membership_holds
                WHERE membership_id = :membershipId
                  AND hold_status = 'ACTIVE'
                  AND is_deleted = FALSE
                ORDER BY membership_hold_id DESC
                LIMIT 1
                """)
                .param("membershipId", membershipId)
                .query((rs, rowNum) -> toDomain(rs))
                .optional();
    }

    public Map<Long, MembershipHold> findActiveByMembershipIds(List<Long> membershipIds) {
        if (membershipIds.isEmpty()) {
            return Map.of();
        }
        return jdbcClient.sql("""
                SELECT
                    membership_hold_id, center_id, membership_id, hold_status,
                    hold_start_date, hold_end_date, resumed_at, actual_hold_days,
                    reason, memo, override_limits,
                    created_at, created_by, updated_at, updated_by
                FROM membership_holds
                WHERE membership_id IN (:membershipIds)
                  AND hold_status = 'ACTIVE'
                  AND is_deleted = FALSE
                ORDER BY membership_id ASC, membership_hold_id DESC
                """)
                .param("membershipIds", membershipIds)
                .query((rs, rowNum) -> toDomain(rs))
                .list()
                .stream()
                .collect(Collectors.toMap(
                        MembershipHold::membershipId,
                        Function.identity(),
                        (current, ignored) -> current
                ));
    }

    public List<MembershipHold> findActiveByHoldEndDateOnOrBefore(LocalDate holdEndDate) {
        return jdbcClient.sql("""
                SELECT
                    membership_hold_id, center_id, membership_id, hold_status,
                    hold_start_date, hold_end_date, resumed_at, actual_hold_days,
                    reason, memo, override_limits,
                    created_at, created_by, updated_at, updated_by
                FROM membership_holds
                WHERE hold_status = 'ACTIVE'
                  AND hold_end_date <= :holdEndDate
                  AND is_deleted = FALSE
                ORDER BY hold_end_date ASC, membership_hold_id ASC
                """)
                .param("holdEndDate", holdEndDate)
                .query((rs, rowNum) -> toDomain(rs))
                .list();
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
                    reason, memo, override_limits,
                    created_at, created_by, updated_at, updated_by
                """)
                .paramSource(command)
                .query((rs, rowNum) -> toDomain(rs))
                .single();
    }

    private MembershipHold toDomain(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new MembershipHold(
                rs.getLong("membership_hold_id"),
                rs.getLong("center_id"),
                rs.getLong("membership_id"),
                HoldStatus.from(rs.getString("hold_status")),
                rs.getObject("hold_start_date", LocalDate.class),
                rs.getObject("hold_end_date", LocalDate.class),
                rs.getObject("resumed_at", OffsetDateTime.class),
                rs.getObject("actual_hold_days", Integer.class),
                rs.getString("reason"),
                rs.getString("memo"),
                rs.getBoolean("override_limits"),
                rs.getObject("created_at", OffsetDateTime.class),
                rs.getObject("created_by", Long.class),
                rs.getObject("updated_at", OffsetDateTime.class),
                rs.getObject("updated_by", Long.class)
        );
    }

    public record MembershipHoldCreateCommand(
            Long centerId,
            Long membershipId,
            String holdStatus,
            LocalDate holdStartDate,
            LocalDate holdEndDate,
            String reason,
            String memo,
            Boolean overrideLimits,
            Long actorUserId
    ) {}

    public record MembershipHoldResumeCommand(
            Long membershipHoldId,
            OffsetDateTime resumedAt,
            Integer actualHoldDays,
            Long actorUserId
    ) {}
}
