package com.gymcrm.reservation.repository;

import com.gymcrm.reservation.entity.ReservationWaitlist;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class ReservationWaitlistRepository {
    private final JdbcClient jdbcClient;

    public ReservationWaitlistRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public Optional<ReservationWaitlist> findById(Long waitingId, Long centerId) {
        return jdbcClient.sql("""
                SELECT
                    wl.waiting_id,
                    wl.schedule_id,
                    wl.member_id,
                    wl.membership_id,
                    wl.queue_order,
                    wl.status,
                    wl.promoted_at,
                    wl.reservation_id,
                    wl.created_at,
                    wl.created_by,
                    wl.updated_at,
                    wl.updated_by
                FROM waiting_list wl
                JOIN trainer_schedules ts ON ts.schedule_id = wl.schedule_id
                WHERE wl.waiting_id = :waitingId
                  AND ts.center_id = :centerId
                  AND ts.is_deleted = FALSE
                """)
                .param("waitingId", waitingId)
                .param("centerId", centerId)
                .query(ReservationWaitlist.class)
                .optional();
    }

    public List<ReservationWaitlist> findAll(Long centerId, Long scheduleId, String status) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    wl.waiting_id,
                    wl.schedule_id,
                    wl.member_id,
                    wl.membership_id,
                    wl.queue_order,
                    wl.status,
                    wl.promoted_at,
                    wl.reservation_id,
                    wl.created_at,
                    wl.created_by,
                    wl.updated_at,
                    wl.updated_by
                FROM waiting_list wl
                JOIN trainer_schedules ts ON ts.schedule_id = wl.schedule_id
                WHERE ts.center_id = :centerId
                  AND ts.is_deleted = FALSE
                """);
        if (scheduleId != null) {
            sql.append(" AND wl.schedule_id = :scheduleId");
        }
        if (status != null && !status.isBlank()) {
            sql.append(" AND wl.status = :status");
        }
        sql.append(" ORDER BY wl.schedule_id ASC, wl.queue_order ASC, wl.waiting_id ASC");

        JdbcClient.StatementSpec statement = jdbcClient.sql(sql.toString())
                .param("centerId", centerId);
        if (scheduleId != null) {
            statement = statement.param("scheduleId", scheduleId);
        }
        if (status != null && !status.isBlank()) {
            statement = statement.param("status", status);
        }
        return statement.query(ReservationWaitlist.class).list();
    }

    public boolean existsByMemberAndSchedule(Long memberId, Long scheduleId) {
        return jdbcClient.sql("""
                SELECT COUNT(1)
                FROM waiting_list
                WHERE member_id = :memberId
                  AND schedule_id = :scheduleId
                  AND status = 'WAITING'
                """)
                .param("memberId", memberId)
                .param("scheduleId", scheduleId)
                .query(Long.class)
                .single() > 0;
    }

    public Optional<ReservationWaitlist> findNextWaiting(Long scheduleId) {
        return jdbcClient.sql("""
                SELECT
                    waiting_id,
                    schedule_id,
                    member_id,
                    membership_id,
                    queue_order,
                    status,
                    promoted_at,
                    reservation_id,
                    created_at,
                    created_by,
                    updated_at,
                    updated_by
                FROM waiting_list
                WHERE schedule_id = :scheduleId
                  AND status = 'WAITING'
                ORDER BY queue_order ASC, waiting_id ASC
                LIMIT 1
                """)
                .param("scheduleId", scheduleId)
                .query(ReservationWaitlist.class)
                .optional();
    }

    public ReservationWaitlist insert(InsertCommand command) {
        return jdbcClient.sql("""
                WITH next_queue AS (
                    SELECT COALESCE(MAX(queue_order), 0) + 1 AS queue_order
                    FROM waiting_list
                    WHERE schedule_id = :scheduleId
                )
                INSERT INTO waiting_list (
                    schedule_id, member_id, membership_id, queue_order, status,
                    created_at, created_by, updated_at, updated_by
                )
                SELECT
                    :scheduleId, :memberId, :membershipId, next_queue.queue_order, 'WAITING',
                    :now, :actorUserId, :now, :actorUserId
                FROM next_queue
                RETURNING
                    waiting_id,
                    schedule_id,
                    member_id,
                    membership_id,
                    queue_order,
                    status,
                    promoted_at,
                    reservation_id,
                    created_at,
                    created_by,
                    updated_at,
                    updated_by
                """)
                .param("scheduleId", command.scheduleId())
                .param("memberId", command.memberId())
                .param("membershipId", command.membershipId())
                .param("now", command.now())
                .param("actorUserId", command.actorUserId())
                .query(ReservationWaitlist.class)
                .single();
    }

    public Optional<ReservationWaitlist> markCancelledIfCurrent(CancelCommand command) {
        return jdbcClient.sql("""
                UPDATE waiting_list
                SET status = 'CANCELLED',
                    updated_at = :now,
                    updated_by = :actorUserId
                WHERE waiting_id = :waitingId
                  AND status = 'WAITING'
                RETURNING
                    waiting_id,
                    schedule_id,
                    member_id,
                    membership_id,
                    queue_order,
                    status,
                    promoted_at,
                    reservation_id,
                    created_at,
                    created_by,
                    updated_at,
                    updated_by
                """)
                .param("waitingId", command.waitingId())
                .param("now", command.now())
                .param("actorUserId", command.actorUserId())
                .query(ReservationWaitlist.class)
                .optional();
    }

    public Optional<ReservationWaitlist> markExpiredIfCurrent(ExpireCommand command) {
        return jdbcClient.sql("""
                UPDATE waiting_list
                SET status = 'EXPIRED',
                    updated_at = :now,
                    updated_by = :actorUserId
                WHERE waiting_id = :waitingId
                  AND status = 'WAITING'
                RETURNING
                    waiting_id,
                    schedule_id,
                    member_id,
                    membership_id,
                    queue_order,
                    status,
                    promoted_at,
                    reservation_id,
                    created_at,
                    created_by,
                    updated_at,
                    updated_by
                """)
                .param("waitingId", command.waitingId())
                .param("now", command.now())
                .param("actorUserId", command.actorUserId())
                .query(ReservationWaitlist.class)
                .optional();
    }

    public Optional<ReservationWaitlist> markPromotedIfCurrent(PromoteCommand command) {
        return jdbcClient.sql("""
                UPDATE waiting_list
                SET status = 'PROMOTED',
                    promoted_at = :promotedAt,
                    reservation_id = :reservationId,
                    updated_at = :promotedAt,
                    updated_by = :actorUserId
                WHERE waiting_id = :waitingId
                  AND status = 'WAITING'
                RETURNING
                    waiting_id,
                    schedule_id,
                    member_id,
                    membership_id,
                    queue_order,
                    status,
                    promoted_at,
                    reservation_id,
                    created_at,
                    created_by,
                    updated_at,
                    updated_by
                """)
                .param("waitingId", command.waitingId())
                .param("reservationId", command.reservationId())
                .param("promotedAt", command.promotedAt())
                .param("actorUserId", command.actorUserId())
                .query(ReservationWaitlist.class)
                .optional();
    }

    public record InsertCommand(
            Long scheduleId,
            Long memberId,
            Long membershipId,
            OffsetDateTime now,
            Long actorUserId
    ) {
    }

    public record CancelCommand(
            Long waitingId,
            OffsetDateTime now,
            Long actorUserId
    ) {
    }

    public record ExpireCommand(
            Long waitingId,
            OffsetDateTime now,
            Long actorUserId
    ) {
    }

    public record PromoteCommand(
            Long waitingId,
            Long reservationId,
            OffsetDateTime promotedAt,
            Long actorUserId
    ) {
    }
}
