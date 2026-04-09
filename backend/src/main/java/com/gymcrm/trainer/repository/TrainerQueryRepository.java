package com.gymcrm.trainer.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public class TrainerQueryRepository {
    private static final String TRAINER_AGGREGATE_FROM = """
            FROM users u
            LEFT JOIN (
                SELECT
                    mm.assigned_trainer_id AS user_id,
                    COUNT(DISTINCT mm.member_id) AS assigned_member_count
                FROM member_memberships mm
                WHERE mm.center_id = :centerId
                  AND mm.is_deleted = FALSE
                  AND mm.assigned_trainer_id IS NOT NULL
                  AND mm.membership_status IN ('ACTIVE', 'HOLDING')
                GROUP BY mm.assigned_trainer_id
            ) assigned_counts ON assigned_counts.user_id = u.user_id
            LEFT JOIN (
                SELECT
                    mm.assigned_trainer_id AS user_id,
                    COUNT(r.reservation_id) AS today_confirmed_reservation_count
                FROM member_memberships mm
                JOIN reservations r
                  ON r.membership_id = mm.membership_id
                 AND r.center_id = mm.center_id
                 AND r.is_deleted = FALSE
                 AND r.reservation_status = 'CONFIRMED'
                 AND (r.reserved_at AT TIME ZONE 'Asia/Seoul')::date = :businessDate
                WHERE mm.center_id = :centerId
                  AND mm.is_deleted = FALSE
                  AND mm.assigned_trainer_id IS NOT NULL
                  AND mm.membership_status IN ('ACTIVE', 'HOLDING')
                GROUP BY mm.assigned_trainer_id
            ) reservation_counts ON reservation_counts.user_id = u.user_id
            WHERE u.center_id = :centerId
              AND u.is_deleted = FALSE
              AND EXISTS (
                    SELECT 1
                    FROM user_roles ur
                    JOIN roles r ON r.role_id = ur.role_id
                    WHERE ur.user_id = u.user_id
                      AND r.role_code = 'ROLE_TRAINER'
              )
              AND (CAST(:status AS VARCHAR) IS NULL OR u.user_status = CAST(:status AS VARCHAR))
              AND (
                    CAST(:keywordPattern AS VARCHAR) IS NULL
                    OR u.user_name ILIKE CAST(:keywordPattern AS VARCHAR)
                    OR u.login_id ILIKE CAST(:keywordPattern AS VARCHAR)
                    OR COALESCE(u.phone, '') ILIKE CAST(:keywordPattern AS VARCHAR)
              )
            """;

    private final JdbcClient jdbcClient;

    public TrainerQueryRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public List<TrainerSummaryRow> findTrainerSummaries(Long centerId, String status, String keyword, LocalDate businessDate) {
        return jdbcClient.sql("""
                SELECT
                    u.user_id AS "userId",
                    u.center_id AS "centerId",
                    u.user_name AS "userName",
                    u.user_status AS "userStatus",
                    u.phone AS "phone",
                    COALESCE(assigned_counts.assigned_member_count, 0) AS "assignedMemberCount",
                    COALESCE(reservation_counts.today_confirmed_reservation_count, 0) AS "todayConfirmedReservationCount"
                """ + TRAINER_AGGREGATE_FROM + """
                ORDER BY u.user_status ASC, u.user_name ASC, u.user_id ASC
                """)
                .param("centerId", centerId)
                .param("status", normalizeBlank(status))
                .param("keywordPattern", keywordPattern(keyword))
                .param("businessDate", businessDate)
                .query(TrainerSummaryRow.class)
                .list();
    }

    public Optional<TrainerDetailRow> findTrainerDetail(Long centerId, Long trainerUserId, LocalDate businessDate) {
        return jdbcClient.sql("""
                SELECT
                    u.user_id AS "userId",
                    u.center_id AS "centerId",
                    u.login_id AS "loginId",
                    u.user_name AS "userName",
                    u.user_status AS "userStatus",
                    u.phone AS "phone",
                    u.pt_session_unit_price AS "ptSessionUnitPrice",
                    u.gx_session_unit_price AS "gxSessionUnitPrice",
                    COALESCE(assigned_counts.assigned_member_count, 0) AS "assignedMemberCount",
                    COALESCE(reservation_counts.today_confirmed_reservation_count, 0) AS "todayConfirmedReservationCount"
                FROM users u
                LEFT JOIN (
                    SELECT
                        mm.assigned_trainer_id AS user_id,
                        COUNT(DISTINCT mm.member_id) AS assigned_member_count
                    FROM member_memberships mm
                    WHERE mm.center_id = :centerId
                      AND mm.is_deleted = FALSE
                      AND mm.assigned_trainer_id IS NOT NULL
                      AND mm.membership_status IN ('ACTIVE', 'HOLDING')
                    GROUP BY mm.assigned_trainer_id
                ) assigned_counts ON assigned_counts.user_id = u.user_id
                LEFT JOIN (
                    SELECT
                        mm.assigned_trainer_id AS user_id,
                        COUNT(r.reservation_id) AS today_confirmed_reservation_count
                    FROM member_memberships mm
                    JOIN reservations r
                      ON r.membership_id = mm.membership_id
                     AND r.center_id = mm.center_id
                     AND r.is_deleted = FALSE
                     AND r.reservation_status = 'CONFIRMED'
                     AND (r.reserved_at AT TIME ZONE 'Asia/Seoul')::date = :businessDate
                    WHERE mm.center_id = :centerId
                      AND mm.is_deleted = FALSE
                      AND mm.assigned_trainer_id IS NOT NULL
                      AND mm.membership_status IN ('ACTIVE', 'HOLDING')
                    GROUP BY mm.assigned_trainer_id
                ) reservation_counts ON reservation_counts.user_id = u.user_id
                WHERE u.center_id = :centerId
                  AND u.is_deleted = FALSE
                  AND EXISTS (
                        SELECT 1
                        FROM user_roles ur
                        JOIN roles r ON r.role_id = ur.role_id
                        WHERE ur.user_id = u.user_id
                          AND r.role_code = 'ROLE_TRAINER'
                  )
                  AND u.user_id = :trainerUserId
                """)
                .param("centerId", centerId)
                .param("businessDate", businessDate)
                .param("trainerUserId", trainerUserId)
                .query(TrainerDetailRow.class)
                .optional();
    }

    public List<AssignedMemberRow> findAssignedMembers(Long centerId, Long trainerUserId) {
        return jdbcClient.sql("""
                SELECT
                    mm.member_id AS "memberId",
                    m.member_name AS "memberName",
                    mm.membership_id AS "membershipId",
                    mm.membership_status AS "membershipStatus"
                FROM member_memberships mm
                JOIN members m
                  ON m.member_id = mm.member_id
                 AND m.center_id = mm.center_id
                 AND m.is_deleted = FALSE
                WHERE mm.center_id = :centerId
                  AND mm.assigned_trainer_id = :trainerUserId
                  AND mm.is_deleted = FALSE
                  AND mm.membership_status IN ('ACTIVE', 'HOLDING')
                ORDER BY m.member_name ASC, mm.membership_id DESC
                LIMIT 20
                """)
                .param("centerId", centerId)
                .param("trainerUserId", trainerUserId)
                .query(AssignedMemberRow.class)
                .list();
    }

    private String normalizeBlank(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed.toUpperCase();
    }

    private String keywordPattern(String keyword) {
        if (keyword == null) {
            return null;
        }
        String trimmed = keyword.trim();
        return trimmed.isEmpty() ? null : "%" + trimmed + "%";
    }

    public record TrainerSummaryRow(
            Long userId,
            Long centerId,
            String userName,
            String userStatus,
            String phone,
            Long assignedMemberCount,
            Long todayConfirmedReservationCount
    ) {
    }

    public record TrainerDetailRow(
            Long userId,
            Long centerId,
            String loginId,
            String userName,
            String userStatus,
            String phone,
            java.math.BigDecimal ptSessionUnitPrice,
            java.math.BigDecimal gxSessionUnitPrice,
            Long assignedMemberCount,
            Long todayConfirmedReservationCount
    ) {
    }

    public record AssignedMemberRow(
            Long memberId,
            String memberName,
            Long membershipId,
            String membershipStatus
    ) {
    }
}
