package com.gymcrm.locker;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class LockerSlotRepository {
    private final JdbcClient jdbcClient;

    public LockerSlotRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public LockerSlot insert(InsertCommand command) {
        return jdbcClient.sql("""
                INSERT INTO locker_slots (
                    center_id, locker_code, locker_zone, locker_grade, locker_status,
                    memo, created_by, updated_by
                )
                VALUES (
                    :centerId, :lockerCode, :lockerZone, :lockerGrade, :lockerStatus,
                    :memo, :actorUserId, :actorUserId
                )
                RETURNING
                    locker_slot_id, center_id, locker_code, locker_zone, locker_grade,
                    locker_status, memo, created_at, updated_at
                """)
                .paramSource(command)
                .query(LockerSlot.class)
                .single();
    }

    public Optional<LockerSlot> findById(Long lockerSlotId, Long centerId) {
        return jdbcClient.sql("""
                SELECT
                    locker_slot_id, center_id, locker_code, locker_zone, locker_grade,
                    locker_status, memo, created_at, updated_at
                FROM locker_slots
                WHERE locker_slot_id = :lockerSlotId
                  AND center_id = :centerId
                  AND is_deleted = FALSE
                """)
                .param("lockerSlotId", lockerSlotId)
                .param("centerId", centerId)
                .query(LockerSlot.class)
                .optional();
    }

    public List<LockerSlot> findAll(Long centerId, String lockerStatus, String lockerZone) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    locker_slot_id, center_id, locker_code, locker_zone, locker_grade,
                    locker_status, memo, created_at, updated_at
                FROM locker_slots
                WHERE center_id = :centerId
                  AND is_deleted = FALSE
                """);
        if (lockerStatus != null) {
            sql.append(" AND locker_status = :lockerStatus");
        }
        if (lockerZone != null) {
            sql.append(" AND locker_zone = :lockerZone");
        }
        sql.append(" ORDER BY locker_code ASC");

        JdbcClient.StatementSpec statement = jdbcClient.sql(sql.toString())
                .param("centerId", centerId);
        if (lockerStatus != null) {
            statement = statement.param("lockerStatus", lockerStatus);
        }
        if (lockerZone != null) {
            statement = statement.param("lockerZone", lockerZone);
        }
        return statement.query(LockerSlot.class).list();
    }

    public Optional<LockerSlot> markAssignedIfAvailable(UpdateStatusCommand command) {
        return jdbcClient.sql("""
                UPDATE locker_slots
                SET locker_status = 'ASSIGNED',
                    updated_at = :now,
                    updated_by = :actorUserId
                WHERE locker_slot_id = :lockerSlotId
                  AND center_id = :centerId
                  AND is_deleted = FALSE
                  AND locker_status = 'AVAILABLE'
                RETURNING
                    locker_slot_id, center_id, locker_code, locker_zone, locker_grade,
                    locker_status, memo, created_at, updated_at
                """)
                .paramSource(command)
                .query(LockerSlot.class)
                .optional();
    }

    public Optional<LockerSlot> markAvailableIfAssigned(UpdateStatusCommand command) {
        return jdbcClient.sql("""
                UPDATE locker_slots
                SET locker_status = 'AVAILABLE',
                    updated_at = :now,
                    updated_by = :actorUserId
                WHERE locker_slot_id = :lockerSlotId
                  AND center_id = :centerId
                  AND is_deleted = FALSE
                  AND locker_status = 'ASSIGNED'
                RETURNING
                    locker_slot_id, center_id, locker_code, locker_zone, locker_grade,
                    locker_status, memo, created_at, updated_at
                """)
                .paramSource(command)
                .query(LockerSlot.class)
                .optional();
    }

    public record InsertCommand(
            Long centerId,
            String lockerCode,
            String lockerZone,
            String lockerGrade,
            String lockerStatus,
            String memo,
            Long actorUserId
    ) {
    }

    public record UpdateStatusCommand(
            Long lockerSlotId,
            Long centerId,
            Long actorUserId,
            OffsetDateTime now
    ) {
    }
}
