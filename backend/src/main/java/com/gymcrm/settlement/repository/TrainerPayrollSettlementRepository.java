package com.gymcrm.settlement.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;

@Repository
public class TrainerPayrollSettlementRepository {
    private final JdbcClient jdbcClient;

    public TrainerPayrollSettlementRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public List<TrainerCompletedCountRow> findMonthlyCompletedPtCounts(QueryCommand command) {
        return jdbcClient.sql("""
                SELECT
                    s.trainer_name AS "trainerName",
                    COUNT(*) AS "completedClassCount"
                FROM reservations r
                JOIN trainer_schedules s ON s.schedule_id = r.schedule_id
                WHERE r.center_id = :centerId
                  AND r.is_deleted = FALSE
                  AND s.is_deleted = FALSE
                  AND s.schedule_type = 'PT'
                  AND r.reservation_status = 'COMPLETED'
                  AND r.completed_at >= :startAt
                  AND r.completed_at < :endExclusiveAt
                GROUP BY s.trainer_name
                ORDER BY "completedClassCount" DESC, "trainerName" ASC
                """)
                .param("centerId", command.centerId())
                .param("startAt", command.startAt())
                .param("endExclusiveAt", command.endExclusiveAt())
                .query(TrainerCompletedCountRow.class)
                .list();
    }

    public record QueryCommand(
            Long centerId,
            OffsetDateTime startAt,
            OffsetDateTime endExclusiveAt
    ) {
    }

    public record TrainerCompletedCountRow(
            String trainerName,
            Long completedClassCount
    ) {
    }
}
