package com.gymcrm.trainer.availability.repository;

import com.gymcrm.trainer.availability.entity.TrainerAvailabilityException;
import com.gymcrm.trainer.availability.entity.TrainerAvailabilityRule;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

@Repository
public class TrainerAvailabilityRepository {
    private final JdbcClient jdbcClient;

    public TrainerAvailabilityRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public List<TrainerAvailabilityRule> findWeeklyRules(Long centerId, Long trainerUserId) {
        return jdbcClient.sql("""
                SELECT
                    availability_rule_id,
                    center_id,
                    trainer_user_id,
                    day_of_week,
                    start_time,
                    end_time,
                    created_at,
                    created_by,
                    updated_at,
                    updated_by
                FROM trainer_availability_rules
                WHERE center_id = :centerId
                  AND trainer_user_id = :trainerUserId
                  AND is_deleted = FALSE
                ORDER BY day_of_week ASC
                """)
                .param("centerId", centerId)
                .param("trainerUserId", trainerUserId)
                .query(TrainerAvailabilityRule.class)
                .list();
    }

    public List<TrainerAvailabilityException> findExceptionsInMonth(Long centerId, Long trainerUserId, LocalDate monthStart, LocalDate monthEndExclusive) {
        return jdbcClient.sql("""
                SELECT
                    availability_exception_id,
                    center_id,
                    trainer_user_id,
                    exception_date,
                    exception_type,
                    override_start_time,
                    override_end_time,
                    memo,
                    created_at,
                    created_by,
                    updated_at,
                    updated_by
                FROM trainer_availability_exceptions
                WHERE center_id = :centerId
                  AND trainer_user_id = :trainerUserId
                  AND is_deleted = FALSE
                  AND exception_date >= :monthStart
                  AND exception_date < :monthEndExclusive
                ORDER BY exception_date ASC
                """)
                .param("centerId", centerId)
                .param("trainerUserId", trainerUserId)
                .param("monthStart", monthStart)
                .param("monthEndExclusive", monthEndExclusive)
                .query(TrainerAvailabilityException.class)
                .list();
    }

    @Transactional
    public void replaceWeeklyRules(Long centerId, Long trainerUserId, Long actorUserId, List<WeeklyRuleCommand> rules) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        jdbcClient.sql("""
                UPDATE trainer_availability_rules
                SET is_deleted = TRUE,
                    deleted_at = :now,
                    deleted_by = :actorUserId,
                    updated_at = :now,
                    updated_by = :actorUserId
                WHERE center_id = :centerId
                  AND trainer_user_id = :trainerUserId
                  AND is_deleted = FALSE
                """)
                .param("now", now)
                .param("actorUserId", actorUserId)
                .param("centerId", centerId)
                .param("trainerUserId", trainerUserId)
                .update();

        for (WeeklyRuleCommand rule : rules) {
            jdbcClient.sql("""
                    INSERT INTO trainer_availability_rules (
                        center_id, trainer_user_id, day_of_week, start_time, end_time,
                        created_at, created_by, updated_at, updated_by
                    )
                    VALUES (
                        :centerId, :trainerUserId, :dayOfWeek, :startTime, :endTime,
                        :now, :actorUserId, :now, :actorUserId
                    )
                    """)
                    .param("centerId", centerId)
                    .param("trainerUserId", trainerUserId)
                    .param("dayOfWeek", rule.dayOfWeek())
                    .param("startTime", rule.startTime())
                    .param("endTime", rule.endTime())
                    .param("now", now)
                    .param("actorUserId", actorUserId)
                    .update();
        }
    }

    @Transactional
    public void upsertException(Long centerId, Long trainerUserId, Long actorUserId, ExceptionCommand command) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        Optional<Long> existingId = jdbcClient.sql("""
                SELECT availability_exception_id
                FROM trainer_availability_exceptions
                WHERE center_id = :centerId
                  AND trainer_user_id = :trainerUserId
                  AND exception_date = :exceptionDate
                  AND is_deleted = FALSE
                """)
                .param("centerId", centerId)
                .param("trainerUserId", trainerUserId)
                .param("exceptionDate", command.exceptionDate())
                .query(Long.class)
                .optional();

        if (existingId.isPresent()) {
            jdbcClient.sql("""
                    UPDATE trainer_availability_exceptions
                    SET exception_type = :exceptionType,
                        override_start_time = :overrideStartTime,
                        override_end_time = :overrideEndTime,
                        memo = :memo,
                        updated_at = :now,
                        updated_by = :actorUserId
                    WHERE availability_exception_id = :exceptionId
                    """)
                    .param("exceptionType", command.exceptionType())
                    .param("overrideStartTime", command.overrideStartTime())
                    .param("overrideEndTime", command.overrideEndTime())
                    .param("memo", command.memo())
                    .param("now", now)
                    .param("actorUserId", actorUserId)
                    .param("exceptionId", existingId.get())
                    .update();
            return;
        }

        jdbcClient.sql("""
                INSERT INTO trainer_availability_exceptions (
                    center_id, trainer_user_id, exception_date, exception_type,
                    override_start_time, override_end_time, memo,
                    created_at, created_by, updated_at, updated_by
                )
                VALUES (
                    :centerId, :trainerUserId, :exceptionDate, :exceptionType,
                    :overrideStartTime, :overrideEndTime, :memo,
                    :now, :actorUserId, :now, :actorUserId
                )
                """)
                .param("centerId", centerId)
                .param("trainerUserId", trainerUserId)
                .param("exceptionDate", command.exceptionDate())
                .param("exceptionType", command.exceptionType())
                .param("overrideStartTime", command.overrideStartTime())
                .param("overrideEndTime", command.overrideEndTime())
                .param("memo", command.memo())
                .param("now", now)
                .param("actorUserId", actorUserId)
                .update();
    }

    @Transactional
    public void deleteException(Long centerId, Long trainerUserId, LocalDate exceptionDate, Long actorUserId) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        jdbcClient.sql("""
                UPDATE trainer_availability_exceptions
                SET is_deleted = TRUE,
                    deleted_at = :now,
                    deleted_by = :actorUserId,
                    updated_at = :now,
                    updated_by = :actorUserId
                WHERE center_id = :centerId
                  AND trainer_user_id = :trainerUserId
                  AND exception_date = :exceptionDate
                  AND is_deleted = FALSE
                """)
                .param("now", now)
                .param("actorUserId", actorUserId)
                .param("centerId", centerId)
                .param("trainerUserId", trainerUserId)
                .param("exceptionDate", exceptionDate)
                .update();
    }

    public record WeeklyRuleCommand(Integer dayOfWeek, LocalTime startTime, LocalTime endTime) {
    }

    public record ExceptionCommand(
            LocalDate exceptionDate,
            String exceptionType,
            LocalTime overrideStartTime,
            LocalTime overrideEndTime,
            String memo
    ) {
    }
}
