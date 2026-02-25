package com.gymcrm.reservation;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Optional;

@Repository
public class TrainerScheduleRepository {
    private final JdbcClient jdbcClient;

    public TrainerScheduleRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public Optional<TrainerSchedule> findById(Long scheduleId) {
        return jdbcClient.sql(baseSelect() + """
                WHERE schedule_id = :scheduleId
                  AND is_deleted = FALSE
                """)
                .param("scheduleId", scheduleId)
                .query(TrainerSchedule.class)
                .optional();
    }

    public Optional<TrainerSchedule> incrementCurrentCountIfAvailable(Long scheduleId, Long actorUserId) {
        return jdbcClient.sql("""
                UPDATE trainer_schedules
                SET
                    current_count = current_count + 1,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = :actorUserId
                WHERE schedule_id = :scheduleId
                  AND is_deleted = FALSE
                  AND current_count < capacity
                """ + returningClause())
                .param("scheduleId", scheduleId)
                .param("actorUserId", actorUserId)
                .query(TrainerSchedule.class)
                .optional();
    }

    public Optional<TrainerSchedule> decrementCurrentCountIfPositive(Long scheduleId, Long actorUserId) {
        return jdbcClient.sql("""
                UPDATE trainer_schedules
                SET
                    current_count = current_count - 1,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = :actorUserId
                WHERE schedule_id = :scheduleId
                  AND is_deleted = FALSE
                  AND current_count > 0
                """ + returningClause())
                .param("scheduleId", scheduleId)
                .param("actorUserId", actorUserId)
                .query(TrainerSchedule.class)
                .optional();
    }

    public TrainerSchedule insert(TrainerScheduleCreateCommand command) {
        return jdbcClient.sql("""
                INSERT INTO trainer_schedules (
                    center_id, schedule_type, trainer_name, slot_title,
                    start_at, end_at, capacity, current_count, memo,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :scheduleType, :trainerName, :slotTitle,
                    :startAt, :endAt, :capacity, :currentCount, :memo,
                    :actorUserId, :actorUserId
                )
                """ + returningClause())
                .paramSource(command)
                .query(TrainerSchedule.class)
                .single();
    }

    private String baseSelect() {
        return """
                SELECT
                    schedule_id, center_id, schedule_type, trainer_name, slot_title,
                    start_at, end_at, capacity, current_count, memo,
                    created_at, created_by, updated_at, updated_by
                FROM trainer_schedules
                """;
    }

    private String returningClause() {
        return """
                RETURNING
                    schedule_id, center_id, schedule_type, trainer_name, slot_title,
                    start_at, end_at, capacity, current_count, memo,
                    created_at, created_by, updated_at, updated_by
                """;
    }

    public record TrainerScheduleCreateCommand(
            Long centerId,
            String scheduleType,
            String trainerName,
            String slotTitle,
            OffsetDateTime startAt,
            OffsetDateTime endAt,
            Integer capacity,
            Integer currentCount,
            String memo,
            Long actorUserId
    ) {}
}
