package com.gymcrm.reservation.gx.repository;

import com.gymcrm.reservation.entity.TrainerSchedule;
import com.gymcrm.reservation.gx.entity.GxScheduleException;
import com.gymcrm.reservation.gx.entity.GxScheduleRule;
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
public class GxScheduleRepository {
    private final JdbcClient jdbcClient;

    public GxScheduleRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public List<GxScheduleRule> findActiveRules(Long centerId) {
        return jdbcClient.sql("""
                SELECT
                    rule_id,
                    center_id,
                    trainer_user_id,
                    class_name,
                    day_of_week,
                    start_time,
                    end_time,
                    capacity,
                    effective_start_date,
                    is_active AS active,
                    created_at,
                    created_by,
                    updated_at,
                    updated_by
                FROM gx_schedule_rules
                WHERE center_id = :centerId
                  AND is_deleted = FALSE
                  AND is_active = TRUE
                ORDER BY day_of_week ASC, start_time ASC, rule_id ASC
                """)
                .param("centerId", centerId)
                .query(GxScheduleRule.class)
                .list();
    }

    public List<GxScheduleRule> findAllRules(Long centerId) {
        return jdbcClient.sql("""
                SELECT
                    rule_id,
                    center_id,
                    trainer_user_id,
                    class_name,
                    day_of_week,
                    start_time,
                    end_time,
                    capacity,
                    effective_start_date,
                    is_active AS active,
                    created_at,
                    created_by,
                    updated_at,
                    updated_by
                FROM gx_schedule_rules
                WHERE center_id = :centerId
                  AND is_deleted = FALSE
                ORDER BY is_active DESC, day_of_week ASC, start_time ASC, rule_id ASC
                """)
                .param("centerId", centerId)
                .query(GxScheduleRule.class)
                .list();
    }

    public Optional<GxScheduleRule> findRuleById(Long centerId, Long ruleId) {
        return jdbcClient.sql("""
                SELECT
                    rule_id,
                    center_id,
                    trainer_user_id,
                    class_name,
                    day_of_week,
                    start_time,
                    end_time,
                    capacity,
                    effective_start_date,
                    is_active AS active,
                    created_at,
                    created_by,
                    updated_at,
                    updated_by
                FROM gx_schedule_rules
                WHERE center_id = :centerId
                  AND rule_id = :ruleId
                  AND is_deleted = FALSE
                """)
                .param("centerId", centerId)
                .param("ruleId", ruleId)
                .query(GxScheduleRule.class)
                .optional();
    }

    public List<GxScheduleException> findExceptionsByRuleInRange(Long centerId, Long ruleId, LocalDate startDate, LocalDate endDateExclusive) {
        return jdbcClient.sql("""
                SELECT
                    exception_id,
                    rule_id,
                    center_id,
                    exception_date,
                    exception_type,
                    override_trainer_user_id,
                    override_start_time,
                    override_end_time,
                    override_capacity,
                    memo,
                    created_at,
                    created_by,
                    updated_at,
                    updated_by
                FROM gx_schedule_exceptions
                WHERE center_id = :centerId
                  AND rule_id = :ruleId
                  AND is_deleted = FALSE
                  AND exception_date >= :startDate
                  AND exception_date < :endDateExclusive
                ORDER BY exception_date ASC
                """)
                .param("centerId", centerId)
                .param("ruleId", ruleId)
                .param("startDate", startDate)
                .param("endDateExclusive", endDateExclusive)
                .query(GxScheduleException.class)
                .list();
    }

    public List<GxScheduleException> findExceptionsInMonth(Long centerId, LocalDate monthStart, LocalDate monthEndExclusive) {
        return jdbcClient.sql("""
                SELECT
                    exception_id,
                    rule_id,
                    center_id,
                    exception_date,
                    exception_type,
                    override_trainer_user_id,
                    override_start_time,
                    override_end_time,
                    override_capacity,
                    memo,
                    created_at,
                    created_by,
                    updated_at,
                    updated_by
                FROM gx_schedule_exceptions
                WHERE center_id = :centerId
                  AND is_deleted = FALSE
                  AND exception_date >= :monthStart
                  AND exception_date < :monthEndExclusive
                ORDER BY exception_date ASC, exception_id ASC
                """)
                .param("centerId", centerId)
                .param("monthStart", monthStart)
                .param("monthEndExclusive", monthEndExclusive)
                .query(GxScheduleException.class)
                .list();
    }

    public List<TrainerSchedule> findGeneratedSchedulesByRuleInRange(Long centerId, Long ruleId, OffsetDateTime startAt, OffsetDateTime endAtExclusive) {
        return jdbcClient.sql("""
                SELECT
                    schedule_id,
                    center_id,
                    trainer_user_id,
                    schedule_type,
                    trainer_name,
                    slot_title,
                    start_at,
                    end_at,
                    capacity,
                    current_count,
                    memo,
                    created_at,
                    created_by,
                    updated_at,
                    updated_by,
                    source_rule_id,
                    source_exception_id
                FROM trainer_schedules
                WHERE center_id = :centerId
                  AND source_rule_id = :ruleId
                  AND is_deleted = FALSE
                  AND start_at >= :startAt
                  AND start_at < :endAtExclusive
                ORDER BY start_at ASC, schedule_id ASC
                """)
                .param("centerId", centerId)
                .param("ruleId", ruleId)
                .param("startAt", startAt)
                .param("endAtExclusive", endAtExclusive)
                .query(TrainerSchedule.class)
                .list();
    }

    public List<TrainerSchedule> findGeneratedSchedulesInMonth(Long centerId, OffsetDateTime monthStart, OffsetDateTime monthEndExclusive) {
        return jdbcClient.sql("""
                SELECT
                    schedule_id,
                    center_id,
                    trainer_user_id,
                    schedule_type,
                    trainer_name,
                    slot_title,
                    start_at,
                    end_at,
                    capacity,
                    current_count,
                    memo,
                    created_at,
                    created_by,
                    updated_at,
                    updated_by,
                    source_rule_id,
                    source_exception_id
                FROM trainer_schedules
                WHERE center_id = :centerId
                  AND schedule_type = 'GX'
                  AND source_rule_id IS NOT NULL
                  AND is_deleted = FALSE
                  AND start_at >= :monthStart
                  AND start_at < :monthEndExclusive
                ORDER BY start_at ASC, schedule_id ASC
                """)
                .param("centerId", centerId)
                .param("monthStart", monthStart)
                .param("monthEndExclusive", monthEndExclusive)
                .query(TrainerSchedule.class)
                .list();
    }

    @Transactional
    public GxScheduleRule insertRule(CreateRuleCommand command) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        Long ruleId = jdbcClient.sql("""
                INSERT INTO gx_schedule_rules (
                    center_id, trainer_user_id, class_name, day_of_week, start_time, end_time,
                    capacity, effective_start_date, is_active,
                    created_at, created_by, updated_at, updated_by
                )
                VALUES (
                    :centerId, :trainerUserId, :className, :dayOfWeek, :startTime, :endTime,
                    :capacity, :effectiveStartDate, TRUE,
                    :now, :actorUserId, :now, :actorUserId
                )
                RETURNING rule_id
                """)
                .param("centerId", command.centerId())
                .param("trainerUserId", command.trainerUserId())
                .param("className", command.className())
                .param("dayOfWeek", command.dayOfWeek())
                .param("startTime", command.startTime())
                .param("endTime", command.endTime())
                .param("capacity", command.capacity())
                .param("effectiveStartDate", command.effectiveStartDate())
                .param("now", now)
                .param("actorUserId", command.actorUserId())
                .query(Long.class)
                .single();
        return findRuleById(command.centerId(), ruleId).orElseThrow();
    }

    @Transactional
    public GxScheduleRule updateRule(UpdateRuleCommand command) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        jdbcClient.sql("""
                UPDATE gx_schedule_rules
                SET trainer_user_id = :trainerUserId,
                    class_name = :className,
                    day_of_week = :dayOfWeek,
                    start_time = :startTime,
                    end_time = :endTime,
                    capacity = :capacity,
                    effective_start_date = :effectiveStartDate,
                    is_active = :active,
                    updated_at = :now,
                    updated_by = :actorUserId
                WHERE center_id = :centerId
                  AND rule_id = :ruleId
                  AND is_deleted = FALSE
                """)
                .param("centerId", command.centerId())
                .param("ruleId", command.ruleId())
                .param("trainerUserId", command.trainerUserId())
                .param("className", command.className())
                .param("dayOfWeek", command.dayOfWeek())
                .param("startTime", command.startTime())
                .param("endTime", command.endTime())
                .param("capacity", command.capacity())
                .param("effectiveStartDate", command.effectiveStartDate())
                .param("active", command.active())
                .param("now", now)
                .param("actorUserId", command.actorUserId())
                .update();
        return findRuleById(command.centerId(), command.ruleId()).orElseThrow();
    }

    @Transactional
    public void softDeleteRule(Long centerId, Long ruleId, Long actorUserId) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        jdbcClient.sql("""
                UPDATE gx_schedule_rules
                SET is_active = FALSE,
                    is_deleted = TRUE,
                    deleted_at = :now,
                    deleted_by = :actorUserId,
                    updated_at = :now,
                    updated_by = :actorUserId
                WHERE center_id = :centerId
                  AND rule_id = :ruleId
                  AND is_deleted = FALSE
                """)
                .param("centerId", centerId)
                .param("ruleId", ruleId)
                .param("actorUserId", actorUserId)
                .param("now", now)
                .update();
    }

    @Transactional
    public GxScheduleException upsertException(UpsertExceptionCommand command) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        Optional<Long> existingId = jdbcClient.sql("""
                SELECT exception_id
                FROM gx_schedule_exceptions
                WHERE center_id = :centerId
                  AND rule_id = :ruleId
                  AND exception_date = :exceptionDate
                  AND is_deleted = FALSE
                """)
                .param("centerId", command.centerId())
                .param("ruleId", command.ruleId())
                .param("exceptionDate", command.exceptionDate())
                .query(Long.class)
                .optional();

        if (existingId.isPresent()) {
            jdbcClient.sql("""
                    UPDATE gx_schedule_exceptions
                    SET exception_type = :exceptionType,
                        override_trainer_user_id = :overrideTrainerUserId,
                        override_start_time = :overrideStartTime,
                        override_end_time = :overrideEndTime,
                        override_capacity = :overrideCapacity,
                        memo = :memo,
                        updated_at = :now,
                        updated_by = :actorUserId
                    WHERE exception_id = :exceptionId
                    """)
                    .param("exceptionId", existingId.get())
                    .param("exceptionType", command.exceptionType())
                    .param("overrideTrainerUserId", command.overrideTrainerUserId())
                    .param("overrideStartTime", command.overrideStartTime())
                    .param("overrideEndTime", command.overrideEndTime())
                    .param("overrideCapacity", command.overrideCapacity())
                    .param("memo", command.memo())
                    .param("now", now)
                    .param("actorUserId", command.actorUserId())
                    .update();
            return findExceptionById(existingId.get()).orElseThrow();
        }

        Long exceptionId = jdbcClient.sql("""
                INSERT INTO gx_schedule_exceptions (
                    rule_id, center_id, exception_date, exception_type,
                    override_trainer_user_id, override_start_time, override_end_time, override_capacity, memo,
                    created_at, created_by, updated_at, updated_by
                )
                VALUES (
                    :ruleId, :centerId, :exceptionDate, :exceptionType,
                    :overrideTrainerUserId, :overrideStartTime, :overrideEndTime, :overrideCapacity, :memo,
                    :now, :actorUserId, :now, :actorUserId
                )
                RETURNING exception_id
                """)
                .param("ruleId", command.ruleId())
                .param("centerId", command.centerId())
                .param("exceptionDate", command.exceptionDate())
                .param("exceptionType", command.exceptionType())
                .param("overrideTrainerUserId", command.overrideTrainerUserId())
                .param("overrideStartTime", command.overrideStartTime())
                .param("overrideEndTime", command.overrideEndTime())
                .param("overrideCapacity", command.overrideCapacity())
                .param("memo", command.memo())
                .param("now", now)
                .param("actorUserId", command.actorUserId())
                .query(Long.class)
                .single();
        return findExceptionById(exceptionId).orElseThrow();
    }

    @Transactional
    public void deleteException(Long centerId, Long ruleId, LocalDate exceptionDate, Long actorUserId) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        jdbcClient.sql("""
                UPDATE gx_schedule_exceptions
                SET is_deleted = TRUE,
                    deleted_at = :now,
                    deleted_by = :actorUserId,
                    updated_at = :now,
                    updated_by = :actorUserId
                WHERE center_id = :centerId
                  AND rule_id = :ruleId
                  AND exception_date = :exceptionDate
                  AND is_deleted = FALSE
                """)
                .param("centerId", centerId)
                .param("ruleId", ruleId)
                .param("exceptionDate", exceptionDate)
                .param("actorUserId", actorUserId)
                .param("now", now)
                .update();
    }

    @Transactional
    public void updateGeneratedSchedule(UpdateGeneratedScheduleCommand command) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        jdbcClient.sql("""
                UPDATE trainer_schedules
                SET trainer_user_id = :trainerUserId,
                    trainer_name = :trainerName,
                    slot_title = :slotTitle,
                    start_at = :startAt,
                    end_at = :endAt,
                    capacity = :capacity,
                    memo = :memo,
                    source_exception_id = :sourceExceptionId,
                    updated_at = :now,
                    updated_by = :actorUserId
                WHERE schedule_id = :scheduleId
                  AND is_deleted = FALSE
                """)
                .param("scheduleId", command.scheduleId())
                .param("trainerUserId", command.trainerUserId())
                .param("trainerName", command.trainerName())
                .param("slotTitle", command.slotTitle())
                .param("startAt", command.startAt())
                .param("endAt", command.endAt())
                .param("capacity", command.capacity())
                .param("memo", command.memo())
                .param("sourceExceptionId", command.sourceExceptionId())
                .param("now", now)
                .param("actorUserId", command.actorUserId())
                .update();
    }

    @Transactional
    public void softDeleteGeneratedSchedule(Long scheduleId, Long actorUserId) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        jdbcClient.sql("""
                UPDATE trainer_schedules
                SET is_deleted = TRUE,
                    deleted_at = :now,
                    deleted_by = :actorUserId,
                    updated_at = :now,
                    updated_by = :actorUserId
                WHERE schedule_id = :scheduleId
                  AND is_deleted = FALSE
                """)
                .param("scheduleId", scheduleId)
                .param("actorUserId", actorUserId)
                .param("now", now)
                .update();
    }

    private Optional<GxScheduleException> findExceptionById(Long exceptionId) {
        return jdbcClient.sql("""
                SELECT
                    exception_id,
                    rule_id,
                    center_id,
                    exception_date,
                    exception_type,
                    override_trainer_user_id,
                    override_start_time,
                    override_end_time,
                    override_capacity,
                    memo,
                    created_at,
                    created_by,
                    updated_at,
                    updated_by
                FROM gx_schedule_exceptions
                WHERE exception_id = :exceptionId
                  AND is_deleted = FALSE
                """)
                .param("exceptionId", exceptionId)
                .query(GxScheduleException.class)
                .optional();
    }

    public record CreateRuleCommand(
            Long centerId,
            Long trainerUserId,
            String className,
            Integer dayOfWeek,
            LocalTime startTime,
            LocalTime endTime,
            Integer capacity,
            LocalDate effectiveStartDate,
            Long actorUserId
    ) {
    }

    public record UpdateRuleCommand(
            Long centerId,
            Long ruleId,
            Long trainerUserId,
            String className,
            Integer dayOfWeek,
            LocalTime startTime,
            LocalTime endTime,
            Integer capacity,
            LocalDate effectiveStartDate,
            Boolean active,
            Long actorUserId
    ) {
    }

    public record UpsertExceptionCommand(
            Long centerId,
            Long ruleId,
            LocalDate exceptionDate,
            String exceptionType,
            Long overrideTrainerUserId,
            LocalTime overrideStartTime,
            LocalTime overrideEndTime,
            Integer overrideCapacity,
            String memo,
            Long actorUserId
    ) {
    }

    public record UpdateGeneratedScheduleCommand(
            Long scheduleId,
            Long trainerUserId,
            String trainerName,
            String slotTitle,
            OffsetDateTime startAt,
            OffsetDateTime endAt,
            Integer capacity,
            String memo,
            Long sourceExceptionId,
            Long actorUserId
    ) {
    }
}
