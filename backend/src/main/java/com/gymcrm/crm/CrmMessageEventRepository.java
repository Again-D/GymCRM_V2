package com.gymcrm.crm;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class CrmMessageEventRepository {
    private final JdbcClient jdbcClient;

    public CrmMessageEventRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public Optional<CrmMessageEvent> insertIfAbsent(InsertCommand command) {
        String sql = """
                INSERT INTO crm_message_events (
                    center_id, member_id, membership_id, event_type, channel_type,
                    dedupe_key, payload_json, send_status, attempt_count,
                    next_attempt_at, trace_id,
                    created_by, updated_by
                ) VALUES (
                    :centerId, :memberId, :membershipId, :eventType, :channelType,
                    :dedupeKey, :payloadJson, :sendStatus, 0,
                    :nextAttemptAt, :traceId,
                    :actorUserId, :actorUserId
                )
                ON CONFLICT (dedupe_key) WHERE is_deleted = FALSE DO NOTHING
                RETURNING
                    crm_message_event_id, center_id, member_id, membership_id,
                    event_type, channel_type, dedupe_key, payload_json,
                    send_status, attempt_count, last_attempted_at,
                    next_attempt_at, sent_at, failed_at, last_error_message,
                    trace_id, created_at, updated_at
                """;
        return jdbcClient.sql(sql)
                .param("centerId", command.centerId())
                .param("memberId", command.memberId())
                .param("membershipId", command.membershipId())
                .param("eventType", command.eventType())
                .param("channelType", command.channelType())
                .param("dedupeKey", command.dedupeKey())
                .param("payloadJson", command.payloadJson())
                .param("sendStatus", command.sendStatus())
                .param("nextAttemptAt", command.nextAttemptAt())
                .param("traceId", command.traceId())
                .param("actorUserId", command.actorUserId())
                .query(CrmMessageEvent.class)
                .optional();
    }

    public List<CrmMessageEvent> findDispatchable(Long centerId, int limit, OffsetDateTime now) {
        String sql = """
                SELECT
                    crm_message_event_id, center_id, member_id, membership_id,
                    event_type, channel_type, dedupe_key, payload_json,
                    send_status, attempt_count, last_attempted_at,
                    next_attempt_at, sent_at, failed_at, last_error_message,
                    trace_id, created_at, updated_at
                FROM crm_message_events
                WHERE center_id = :centerId
                  AND is_deleted = FALSE
                  AND send_status IN ('PENDING', 'RETRY_WAIT')
                  AND (next_attempt_at IS NULL OR next_attempt_at <= :now)
                ORDER BY crm_message_event_id ASC
                LIMIT :limit
                """;

        return jdbcClient.sql(sql)
                .param("centerId", centerId)
                .param("now", now)
                .param("limit", limit)
                .query(CrmMessageEvent.class)
                .list();
    }

    public List<CrmMessageEvent> findPendingDispatchable(Long centerId, int limit, OffsetDateTime now) {
        String sql = """
                SELECT
                    crm_message_event_id, center_id, member_id, membership_id,
                    event_type, channel_type, dedupe_key, payload_json,
                    send_status, attempt_count, last_attempted_at,
                    next_attempt_at, sent_at, failed_at, last_error_message,
                    trace_id, created_at, updated_at
                FROM crm_message_events
                WHERE center_id = :centerId
                  AND is_deleted = FALSE
                  AND send_status = 'PENDING'
                  AND (next_attempt_at IS NULL OR next_attempt_at <= :now)
                ORDER BY crm_message_event_id ASC
                LIMIT :limit
                """;

        return jdbcClient.sql(sql)
                .param("centerId", centerId)
                .param("now", now)
                .param("limit", limit)
                .query(CrmMessageEvent.class)
                .list();
    }

    public List<CrmMessageEvent> findRetryDispatchableByIds(Long centerId, List<Long> crmMessageEventIds, OffsetDateTime now) {
        if (crmMessageEventIds == null || crmMessageEventIds.isEmpty()) {
            return List.of();
        }

        String sql = """
                SELECT
                    crm_message_event_id, center_id, member_id, membership_id,
                    event_type, channel_type, dedupe_key, payload_json,
                    send_status, attempt_count, last_attempted_at,
                    next_attempt_at, sent_at, failed_at, last_error_message,
                    trace_id, created_at, updated_at
                FROM crm_message_events
                WHERE center_id = :centerId
                  AND is_deleted = FALSE
                  AND send_status = 'RETRY_WAIT'
                  AND crm_message_event_id IN (:crmMessageEventIds)
                  AND next_attempt_at IS NOT NULL
                  AND next_attempt_at <= :now
                ORDER BY crm_message_event_id ASC
                """;

        return jdbcClient.sql(sql)
                .param("centerId", centerId)
                .param("crmMessageEventIds", crmMessageEventIds)
                .param("now", now)
                .query(CrmMessageEvent.class)
                .list();
    }

    public List<CrmMessageEvent> findRecent(Long centerId, String sendStatus, int limit) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    crm_message_event_id, center_id, member_id, membership_id,
                    event_type, channel_type, dedupe_key, payload_json,
                    send_status, attempt_count, last_attempted_at,
                    next_attempt_at, sent_at, failed_at, last_error_message,
                    trace_id, created_at, updated_at
                FROM crm_message_events
                WHERE center_id = :centerId
                  AND is_deleted = FALSE
                """);

        if (sendStatus != null) {
            sql.append(" AND send_status = :sendStatus");
        }
        sql.append(" ORDER BY crm_message_event_id DESC LIMIT :limit");

        JdbcClient.StatementSpec statement = jdbcClient.sql(sql.toString())
                .param("centerId", centerId)
                .param("limit", limit);
        if (sendStatus != null) {
            statement = statement.param("sendStatus", sendStatus);
        }

        return statement.query(CrmMessageEvent.class).list();
    }

    public Optional<CrmMessageEvent> markSent(UpdateSentCommand command) {
        String sql = """
                UPDATE crm_message_events
                SET send_status = 'SENT',
                    attempt_count = attempt_count + 1,
                    last_attempted_at = :attemptedAt,
                    sent_at = :attemptedAt,
                    failed_at = NULL,
                    next_attempt_at = NULL,
                    last_error_message = NULL,
                    trace_id = :traceId,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = :actorUserId
                WHERE crm_message_event_id = :crmMessageEventId
                  AND center_id = :centerId
                  AND is_deleted = FALSE
                RETURNING
                    crm_message_event_id, center_id, member_id, membership_id,
                    event_type, channel_type, dedupe_key, payload_json,
                    send_status, attempt_count, last_attempted_at,
                    next_attempt_at, sent_at, failed_at, last_error_message,
                    trace_id, created_at, updated_at
                """;

        return jdbcClient.sql(sql)
                .param("crmMessageEventId", command.crmMessageEventId())
                .param("centerId", command.centerId())
                .param("attemptedAt", command.attemptedAt())
                .param("traceId", command.traceId())
                .param("actorUserId", command.actorUserId())
                .query(CrmMessageEvent.class)
                .optional();
    }

    public Optional<CrmMessageEvent> markRetryWait(UpdateRetryCommand command) {
        String sql = """
                UPDATE crm_message_events
                SET send_status = 'RETRY_WAIT',
                    attempt_count = attempt_count + 1,
                    last_attempted_at = :attemptedAt,
                    next_attempt_at = :nextAttemptAt,
                    failed_at = :attemptedAt,
                    last_error_message = :lastErrorMessage,
                    trace_id = :traceId,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = :actorUserId
                WHERE crm_message_event_id = :crmMessageEventId
                  AND center_id = :centerId
                  AND is_deleted = FALSE
                RETURNING
                    crm_message_event_id, center_id, member_id, membership_id,
                    event_type, channel_type, dedupe_key, payload_json,
                    send_status, attempt_count, last_attempted_at,
                    next_attempt_at, sent_at, failed_at, last_error_message,
                    trace_id, created_at, updated_at
                """;

        return jdbcClient.sql(sql)
                .param("crmMessageEventId", command.crmMessageEventId())
                .param("centerId", command.centerId())
                .param("attemptedAt", command.attemptedAt())
                .param("nextAttemptAt", command.nextAttemptAt())
                .param("lastErrorMessage", command.lastErrorMessage())
                .param("traceId", command.traceId())
                .param("actorUserId", command.actorUserId())
                .query(CrmMessageEvent.class)
                .optional();
    }

    public Optional<CrmMessageEvent> markDead(UpdateDeadCommand command) {
        String sql = """
                UPDATE crm_message_events
                SET send_status = 'DEAD',
                    attempt_count = attempt_count + 1,
                    last_attempted_at = :attemptedAt,
                    next_attempt_at = NULL,
                    failed_at = :attemptedAt,
                    last_error_message = :lastErrorMessage,
                    trace_id = :traceId,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = :actorUserId
                WHERE crm_message_event_id = :crmMessageEventId
                  AND center_id = :centerId
                  AND is_deleted = FALSE
                RETURNING
                    crm_message_event_id, center_id, member_id, membership_id,
                    event_type, channel_type, dedupe_key, payload_json,
                    send_status, attempt_count, last_attempted_at,
                    next_attempt_at, sent_at, failed_at, last_error_message,
                    trace_id, created_at, updated_at
                """;

        return jdbcClient.sql(sql)
                .param("crmMessageEventId", command.crmMessageEventId())
                .param("centerId", command.centerId())
                .param("attemptedAt", command.attemptedAt())
                .param("lastErrorMessage", command.lastErrorMessage())
                .param("traceId", command.traceId())
                .param("actorUserId", command.actorUserId())
                .query(CrmMessageEvent.class)
                .optional();
    }

    public record InsertCommand(
            Long centerId,
            Long memberId,
            Long membershipId,
            String eventType,
            String channelType,
            String dedupeKey,
            String payloadJson,
            String sendStatus,
            OffsetDateTime nextAttemptAt,
            String traceId,
            Long actorUserId
    ) {
    }

    public record UpdateSentCommand(
            Long crmMessageEventId,
            Long centerId,
            OffsetDateTime attemptedAt,
            String traceId,
            Long actorUserId
    ) {
    }

    public record UpdateRetryCommand(
            Long crmMessageEventId,
            Long centerId,
            OffsetDateTime attemptedAt,
            OffsetDateTime nextAttemptAt,
            String lastErrorMessage,
            String traceId,
            Long actorUserId
    ) {
    }

    public record UpdateDeadCommand(
            Long crmMessageEventId,
            Long centerId,
            OffsetDateTime attemptedAt,
            String lastErrorMessage,
            String traceId,
            Long actorUserId
    ) {
    }
}
