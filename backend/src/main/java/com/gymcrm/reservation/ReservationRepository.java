package com.gymcrm.reservation;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class ReservationRepository {
    private final JdbcClient jdbcClient;

    public ReservationRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public Reservation insert(ReservationCreateCommand command) {
        return jdbcClient.sql("""
                INSERT INTO reservations (
                    center_id, member_id, membership_id, schedule_id,
                    reservation_status, reserved_at, memo,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :memberId, :membershipId, :scheduleId,
                    :reservationStatus, :reservedAt, :memo,
                    :actorUserId, :actorUserId
                )
                """ + returningClause())
                .paramSource(command)
                .query(Reservation.class)
                .single();
    }

    public Optional<Reservation> findById(Long reservationId, Long centerId) {
        return jdbcClient.sql(baseSelect() + """
                WHERE reservation_id = :reservationId
                  AND center_id = :centerId
                  AND is_deleted = FALSE
                """)
                .param("reservationId", reservationId)
                .param("centerId", centerId)
                .query(Reservation.class)
                .optional();
    }

    public List<Reservation> findAll(Long centerId, Long memberId, Long scheduleId, String reservationStatus) {
        StringBuilder sql = new StringBuilder(baseSelect())
                .append("""
                        WHERE center_id = :centerId
                          AND is_deleted = FALSE
                        """);
        if (memberId != null) {
            sql.append(" AND member_id = :memberId");
        }
        if (scheduleId != null) {
            sql.append(" AND schedule_id = :scheduleId");
        }
        if (reservationStatus != null) {
            sql.append(" AND reservation_status = :reservationStatus");
        }
        sql.append(" ORDER BY reservation_id DESC");

        JdbcClient.StatementSpec statement = jdbcClient.sql(sql.toString())
                .param("centerId", centerId);
        if (memberId != null) {
            statement = statement.param("memberId", memberId);
        }
        if (scheduleId != null) {
            statement = statement.param("scheduleId", scheduleId);
        }
        if (reservationStatus != null) {
            statement = statement.param("reservationStatus", reservationStatus);
        }
        return statement.query(Reservation.class).list();
    }

    public boolean existsConfirmedByMemberAndSchedule(Long memberId, Long scheduleId) {
        Boolean exists = jdbcClient.sql("""
                SELECT EXISTS (
                    SELECT 1
                    FROM reservations
                    WHERE member_id = :memberId
                      AND schedule_id = :scheduleId
                      AND reservation_status = 'CONFIRMED'
                      AND is_deleted = FALSE
                )
                """)
                .param("memberId", memberId)
                .param("scheduleId", scheduleId)
                .query(Boolean.class)
                .single();
        return Boolean.TRUE.equals(exists);
    }

    public Optional<Reservation> markCancelledIfCurrent(ReservationCancelCommand command) {
        return jdbcClient.sql("""
                UPDATE reservations
                SET
                    reservation_status = 'CANCELLED',
                    cancelled_at = :cancelledAt,
                    cancel_reason = :cancelReason,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = :actorUserId
                WHERE reservation_id = :reservationId
                  AND center_id = :centerId
                  AND reservation_status = :expectedStatus
                  AND is_deleted = FALSE
                """ + returningClause())
                .paramSource(command)
                .query(Reservation.class)
                .optional();
    }

    public Optional<Reservation> markCompletedIfCurrent(ReservationCompleteCommand command) {
        return jdbcClient.sql("""
                UPDATE reservations
                SET
                    reservation_status = 'COMPLETED',
                    completed_at = :completedAt,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = :actorUserId
                WHERE reservation_id = :reservationId
                  AND center_id = :centerId
                  AND reservation_status = :expectedStatus
                  AND is_deleted = FALSE
                """ + returningClause())
                .paramSource(command)
                .query(Reservation.class)
                .optional();
    }

    private String baseSelect() {
        return """
                SELECT
                    reservation_id, center_id, member_id, membership_id, schedule_id,
                    reservation_status, reserved_at, cancelled_at, completed_at,
                    cancel_reason, memo,
                    created_at, created_by, updated_at, updated_by
                FROM reservations
                """;
    }

    private String returningClause() {
        return """
                RETURNING
                    reservation_id, center_id, member_id, membership_id, schedule_id,
                    reservation_status, reserved_at, cancelled_at, completed_at,
                    cancel_reason, memo,
                    created_at, created_by, updated_at, updated_by
                """;
    }

    public record ReservationCreateCommand(
            Long centerId,
            Long memberId,
            Long membershipId,
            Long scheduleId,
            String reservationStatus,
            OffsetDateTime reservedAt,
            String memo,
            Long actorUserId
    ) {}

    public record ReservationCancelCommand(
            Long reservationId,
            Long centerId,
            String expectedStatus,
            OffsetDateTime cancelledAt,
            String cancelReason,
            Long actorUserId
    ) {}

    public record ReservationCompleteCommand(
            Long reservationId,
            Long centerId,
            String expectedStatus,
            OffsetDateTime completedAt,
            Long actorUserId
    ) {}
}
