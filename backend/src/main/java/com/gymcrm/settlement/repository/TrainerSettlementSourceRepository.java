package com.gymcrm.settlement.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Repository
public class TrainerSettlementSourceRepository {
    private final JdbcClient jdbcClient;

    public TrainerSettlementSourceRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public List<TrainerSettlementSourceRow> findCompletedPtSources(
            Long centerId,
            OffsetDateTime startAt,
            OffsetDateTime endExclusiveAt,
            Long trainerUserId
    ) {
        return findSettlementMetrics(centerId, startAt, endExclusiveAt, trainerUserId);
    }

    public List<TrainerSettlementSourceRow> findSettlementMetrics(
            Long centerId,
            OffsetDateTime startAt,
            OffsetDateTime endExclusiveAt,
            Long trainerUserId
    ) {
        String sql = trainerUserId == null
                ? """
                SELECT
                    u.user_id AS "trainerUserId",
                    u.user_name AS "userName",
                    u.pt_session_unit_price AS "ptSessionUnitPrice",
                    u.gx_session_unit_price AS "gxSessionUnitPrice",
                    COUNT(*) FILTER (
                        WHERE s.schedule_type = 'PT'
                    ) AS "ptSessionCount",
                    COUNT(*) FILTER (
                        WHERE s.schedule_type = 'GX'
                    ) AS "gxSessionCount",
                    COUNT(*) FILTER (
                        WHERE r.reservation_status = 'COMPLETED'
                          AND s.schedule_type = 'PT'
                          AND r.completed_at >= :startAt
                          AND r.completed_at < :endExclusiveAt
                    ) AS "ptCompletedClassCount",
                    COUNT(*) FILTER (
                        WHERE r.reservation_status = 'COMPLETED'
                          AND s.schedule_type = 'GX'
                          AND r.completed_at >= :startAt
                          AND r.completed_at < :endExclusiveAt
                    ) AS "gxCompletedClassCount",
                    COUNT(*) FILTER (
                        WHERE r.reservation_status = 'CANCELLED'
                          AND r.cancelled_at >= :startAt
                          AND r.cancelled_at < :endExclusiveAt
                    ) AS "cancelledClassCount",
                    COUNT(*) FILTER (
                        WHERE r.reservation_status = 'NO_SHOW'
                          AND r.no_show_at >= :startAt
                          AND r.no_show_at < :endExclusiveAt
                    ) AS "noShowClassCount"
                FROM reservations r
                JOIN trainer_schedules s
                  ON s.schedule_id = r.schedule_id
                 AND s.is_deleted = FALSE
                JOIN users u
                  ON u.user_id = s.trainer_user_id
                 AND u.center_id = r.center_id
                 AND u.is_deleted = FALSE
                WHERE r.center_id = :centerId
                  AND r.is_deleted = FALSE
                  AND s.trainer_user_id IS NOT NULL
                  AND (
                    (r.reservation_status = 'COMPLETED' AND r.completed_at >= :startAt AND r.completed_at < :endExclusiveAt)
                    OR (r.reservation_status = 'CANCELLED' AND r.cancelled_at >= :startAt AND r.cancelled_at < :endExclusiveAt)
                    OR (r.reservation_status = 'NO_SHOW' AND r.no_show_at >= :startAt AND r.no_show_at < :endExclusiveAt)
                  )
                GROUP BY u.user_id, u.user_name, u.pt_session_unit_price, u.gx_session_unit_price
                ORDER BY "userName" ASC, "trainerUserId" ASC
                """
                : """
                SELECT
                    u.user_id AS "trainerUserId",
                    u.user_name AS "userName",
                    u.pt_session_unit_price AS "ptSessionUnitPrice",
                    u.gx_session_unit_price AS "gxSessionUnitPrice",
                    COUNT(*) FILTER (
                        WHERE s.schedule_type = 'PT'
                    ) AS "ptSessionCount",
                    COUNT(*) FILTER (
                        WHERE s.schedule_type = 'GX'
                    ) AS "gxSessionCount",
                    COUNT(*) FILTER (
                        WHERE r.reservation_status = 'COMPLETED'
                          AND s.schedule_type = 'PT'
                          AND r.completed_at >= :startAt
                          AND r.completed_at < :endExclusiveAt
                    ) AS "ptCompletedClassCount",
                    COUNT(*) FILTER (
                        WHERE r.reservation_status = 'COMPLETED'
                          AND s.schedule_type = 'GX'
                          AND r.completed_at >= :startAt
                          AND r.completed_at < :endExclusiveAt
                    ) AS "gxCompletedClassCount",
                    COUNT(*) FILTER (
                        WHERE r.reservation_status = 'CANCELLED'
                          AND r.cancelled_at >= :startAt
                          AND r.cancelled_at < :endExclusiveAt
                    ) AS "cancelledClassCount",
                    COUNT(*) FILTER (
                        WHERE r.reservation_status = 'NO_SHOW'
                          AND r.no_show_at >= :startAt
                          AND r.no_show_at < :endExclusiveAt
                    ) AS "noShowClassCount"
                FROM reservations r
                JOIN trainer_schedules s
                  ON s.schedule_id = r.schedule_id
                 AND s.is_deleted = FALSE
                JOIN users u
                  ON u.user_id = s.trainer_user_id
                 AND u.center_id = r.center_id
                 AND u.is_deleted = FALSE
                WHERE r.center_id = :centerId
                  AND r.is_deleted = FALSE
                  AND s.trainer_user_id = :trainerUserId
                  AND (
                    (r.reservation_status = 'COMPLETED' AND r.completed_at >= :startAt AND r.completed_at < :endExclusiveAt)
                    OR (r.reservation_status = 'CANCELLED' AND r.cancelled_at >= :startAt AND r.cancelled_at < :endExclusiveAt)
                    OR (r.reservation_status = 'NO_SHOW' AND r.no_show_at >= :startAt AND r.no_show_at < :endExclusiveAt)
                  )
                GROUP BY u.user_id, u.user_name, u.pt_session_unit_price, u.gx_session_unit_price
                ORDER BY "userName" ASC, "trainerUserId" ASC
                """;
        JdbcClient.StatementSpec statement = jdbcClient.sql(sql)
                .param("centerId", centerId)
                .param("startAt", startAt)
                .param("endExclusiveAt", endExclusiveAt);
        if (trainerUserId != null) {
            statement.param("trainerUserId", trainerUserId);
        }
        return statement.query(TrainerSettlementSourceRow.class).list();
    }

    public Map<Long, String> findTrainerNames(Long centerId, Collection<Long> trainerUserIds) {
        if (trainerUserIds.isEmpty()) {
            return Map.of();
        }
        return jdbcClient.sql("""
                SELECT
                    user_id AS "trainerUserId",
                    user_name AS "userName"
                FROM users
                WHERE center_id = :centerId
                  AND is_deleted = FALSE
                  AND user_id IN (:trainerUserIds)
                """)
                .param("centerId", centerId)
                .param("trainerUserIds", trainerUserIds)
                .query(TrainerNameRow.class)
                .list()
                .stream()
                .collect(Collectors.toMap(TrainerNameRow::trainerUserId, TrainerNameRow::userName, (left, right) -> left));
    }

    public record TrainerSettlementSourceRow(
            Long trainerUserId,
            String userName,
            java.math.BigDecimal ptSessionUnitPrice,
            java.math.BigDecimal gxSessionUnitPrice,
            Long ptSessionCount,
            Long gxSessionCount,
            Long ptCompletedClassCount,
            Long gxCompletedClassCount,
            Long cancelledClassCount,
            Long noShowClassCount
    ) {
    }

    public record TrainerNameRow(
            Long trainerUserId,
            String userName
    ) {
    }
}
