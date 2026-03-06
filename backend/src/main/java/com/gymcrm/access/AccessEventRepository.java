package com.gymcrm.access;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;

@Repository
public class AccessEventRepository {
    private final JdbcClient jdbcClient;

    public AccessEventRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public AccessEvent insert(InsertCommand command) {
        return jdbcClient.sql("""
                INSERT INTO access_events (
                    center_id, member_id, membership_id, reservation_id,
                    processed_by, event_type, deny_reason, processed_at
                )
                VALUES (
                    :centerId, :memberId, :membershipId, :reservationId,
                    :processedBy, :eventType, :denyReason, :processedAt
                )
                RETURNING
                    access_event_id, center_id, member_id, membership_id, reservation_id,
                    processed_by, event_type, deny_reason, processed_at, created_at
                """)
                .paramSource(command)
                .query(AccessEvent.class)
                .single();
    }

    public List<AccessEvent> findAll(Long centerId, Long memberId, String eventType, int limit) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    access_event_id, center_id, member_id, membership_id, reservation_id,
                    processed_by, event_type, deny_reason, processed_at, created_at
                FROM access_events
                WHERE center_id = :centerId
                """);
        if (memberId != null) {
            sql.append(" AND member_id = :memberId");
        }
        if (eventType != null) {
            sql.append(" AND event_type = :eventType");
        }
        sql.append(" ORDER BY processed_at DESC, access_event_id DESC LIMIT :limit");

        JdbcClient.StatementSpec statement = jdbcClient.sql(sql.toString())
                .param("centerId", centerId)
                .param("limit", limit);
        if (memberId != null) {
            statement = statement.param("memberId", memberId);
        }
        if (eventType != null) {
            statement = statement.param("eventType", eventType);
        }
        return statement.query(AccessEvent.class).list();
    }

    public int countTodayByType(Long centerId, String eventType) {
        Integer count = jdbcClient.sql("""
                SELECT COUNT(*)
                FROM access_events
                WHERE center_id = :centerId
                  AND event_type = :eventType
                  AND (processed_at AT TIME ZONE 'Asia/Seoul')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::date
                """)
                .param("centerId", centerId)
                .param("eventType", eventType)
                .query(Integer.class)
                .single();
        return count == null ? 0 : count;
    }

    public int countDeniedBetween(Long centerId, OffsetDateTime from, OffsetDateTime to) {
        Integer count = jdbcClient.sql("""
                SELECT COUNT(*)
                FROM access_events
                WHERE center_id = :centerId
                  AND event_type = 'ENTRY_DENIED'
                  AND processed_at >= :fromAt
                  AND processed_at < :toAt
                """)
                .param("centerId", centerId)
                .param("fromAt", from)
                .param("toAt", to)
                .query(Integer.class)
                .single();
        return count == null ? 0 : count;
    }

    public List<DeniedReasonCount> countDeniedByReasonBetween(Long centerId, OffsetDateTime from, OffsetDateTime to) {
        return jdbcClient.sql("""
                SELECT deny_reason, COUNT(*) AS denied_count
                FROM access_events
                WHERE center_id = :centerId
                  AND event_type = 'ENTRY_DENIED'
                  AND processed_at >= :fromAt
                  AND processed_at < :toAt
                GROUP BY deny_reason
                ORDER BY denied_count DESC, deny_reason ASC
                """)
                .param("centerId", centerId)
                .param("fromAt", from)
                .param("toAt", to)
                .query(DeniedReasonCount.class)
                .list();
    }

    public List<DeniedEventRow> findRecentDenied(Long centerId, OffsetDateTime from, OffsetDateTime to, int limit) {
        return jdbcClient.sql("""
                SELECT
                    e.access_event_id,
                    e.member_id,
                    m.member_name,
                    e.deny_reason,
                    e.processed_at
                FROM access_events e
                JOIN members m ON m.member_id = e.member_id
                WHERE e.center_id = :centerId
                  AND e.event_type = 'ENTRY_DENIED'
                  AND e.processed_at >= :fromAt
                  AND e.processed_at < :toAt
                ORDER BY e.processed_at DESC, e.access_event_id DESC
                LIMIT :limit
                """)
                .param("centerId", centerId)
                .param("fromAt", from)
                .param("toAt", to)
                .param("limit", limit)
                .query(DeniedEventRow.class)
                .list();
    }

    public List<RepeatedDeniedMember> findRepeatedDeniedMembers(
            Long centerId,
            OffsetDateTime from,
            OffsetDateTime to,
            int minAttempts
    ) {
        return jdbcClient.sql("""
                SELECT
                    e.member_id,
                    m.member_name,
                    COUNT(*) AS denied_count,
                    MAX(e.processed_at) AS last_denied_at
                FROM access_events e
                JOIN members m ON m.member_id = e.member_id
                WHERE e.center_id = :centerId
                  AND e.event_type = 'ENTRY_DENIED'
                  AND e.processed_at >= :fromAt
                  AND e.processed_at < :toAt
                GROUP BY e.member_id, m.member_name
                HAVING COUNT(*) >= :minAttempts
                ORDER BY denied_count DESC, last_denied_at DESC
                """)
                .param("centerId", centerId)
                .param("fromAt", from)
                .param("toAt", to)
                .param("minAttempts", minAttempts)
                .query(RepeatedDeniedMember.class)
                .list();
    }

    public record InsertCommand(
            Long centerId,
            Long memberId,
            Long membershipId,
            Long reservationId,
            Long processedBy,
            String eventType,
            String denyReason,
            OffsetDateTime processedAt
    ) {}

    public record DeniedReasonCount(
            String denyReason,
            int deniedCount
    ) {}

    public record DeniedEventRow(
            Long accessEventId,
            Long memberId,
            String memberName,
            String denyReason,
            OffsetDateTime processedAt
    ) {}

    public record RepeatedDeniedMember(
            Long memberId,
            String memberName,
            int deniedCount,
            OffsetDateTime lastDeniedAt
    ) {}
}
