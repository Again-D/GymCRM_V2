package com.gymcrm.locker;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class LockerAssignmentRepository {
    private final JdbcClient jdbcClient;

    public LockerAssignmentRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public LockerAssignment insertActive(InsertCommand command) {
        return jdbcClient.sql("""
                INSERT INTO locker_assignments (
                    center_id, locker_slot_id, member_id, assignment_status,
                    assigned_at, start_date, end_date, memo,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :lockerSlotId, :memberId, 'ACTIVE',
                    :assignedAt, :startDate, :endDate, :memo,
                    :actorUserId, :actorUserId
                )
                RETURNING
                    locker_assignment_id, center_id, locker_slot_id, member_id,
                    assignment_status, assigned_at, start_date, end_date,
                    returned_at, refund_amount, return_reason, memo,
                    created_at, updated_at
                """)
                .paramSource(command)
                .query(LockerAssignment.class)
                .single();
    }

    public Optional<LockerAssignment> findById(Long lockerAssignmentId, Long centerId) {
        return jdbcClient.sql("""
                SELECT
                    locker_assignment_id, center_id, locker_slot_id, member_id,
                    assignment_status, assigned_at, start_date, end_date,
                    returned_at, refund_amount, return_reason, memo,
                    created_at, updated_at
                FROM locker_assignments
                WHERE locker_assignment_id = :lockerAssignmentId
                  AND center_id = :centerId
                  AND is_deleted = FALSE
                """)
                .param("lockerAssignmentId", lockerAssignmentId)
                .param("centerId", centerId)
                .query(LockerAssignment.class)
                .optional();
    }

    public List<LockerAssignment> findAll(Long centerId, boolean activeOnly) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    locker_assignment_id, center_id, locker_slot_id, member_id,
                    assignment_status, assigned_at, start_date, end_date,
                    returned_at, refund_amount, return_reason, memo,
                    created_at, updated_at
                FROM locker_assignments
                WHERE center_id = :centerId
                  AND is_deleted = FALSE
                """);
        if (activeOnly) {
            sql.append(" AND assignment_status = 'ACTIVE'");
        }
        sql.append(" ORDER BY assigned_at DESC, locker_assignment_id DESC");

        return jdbcClient.sql(sql.toString())
                .param("centerId", centerId)
                .query(LockerAssignment.class)
                .list();
    }

    public Optional<LockerAssignment> closeAssignment(CloseCommand command) {
        return jdbcClient.sql("""
                UPDATE locker_assignments
                SET assignment_status = 'RETURNED',
                    returned_at = :returnedAt,
                    refund_amount = :refundAmount,
                    return_reason = :returnReason,
                    memo = COALESCE(:memo, memo),
                    updated_at = :returnedAt,
                    updated_by = :actorUserId
                WHERE locker_assignment_id = :lockerAssignmentId
                  AND center_id = :centerId
                  AND is_deleted = FALSE
                  AND assignment_status = 'ACTIVE'
                RETURNING
                    locker_assignment_id, center_id, locker_slot_id, member_id,
                    assignment_status, assigned_at, start_date, end_date,
                    returned_at, refund_amount, return_reason, memo,
                    created_at, updated_at
                """)
                .paramSource(command)
                .query(LockerAssignment.class)
                .optional();
    }

    public record InsertCommand(
            Long centerId,
            Long lockerSlotId,
            Long memberId,
            OffsetDateTime assignedAt,
            LocalDate startDate,
            LocalDate endDate,
            String memo,
            Long actorUserId
    ) {
    }

    public record CloseCommand(
            Long lockerAssignmentId,
            Long centerId,
            OffsetDateTime returnedAt,
            BigDecimal refundAmount,
            String returnReason,
            String memo,
            Long actorUserId
    ) {
    }
}
