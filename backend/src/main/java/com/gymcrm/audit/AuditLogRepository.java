package com.gymcrm.audit;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class AuditLogRepository {
    private final JdbcClient jdbcClient;

    public AuditLogRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public AuditLog insert(InsertCommand command) {
        return jdbcClient.sql("""
                INSERT INTO audit_logs (
                    center_id, event_type, actor_user_id,
                    resource_type, resource_id, event_at, trace_id, attributes_json
                ) VALUES (
                    :centerId, :eventType, :actorUserId,
                    :resourceType, :resourceId, :eventAt, :traceId, :attributesJson
                )
                RETURNING
                    audit_log_id, center_id, event_type, actor_user_id,
                    resource_type, resource_id, event_at, trace_id, attributes_json, created_at
                """)
                .paramSource(command)
                .query(AuditLog.class)
                .single();
    }

    public List<AuditLog> findRecent(Long centerId, String eventType, int limit) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    audit_log_id, center_id, event_type, actor_user_id,
                    resource_type, resource_id, event_at, trace_id, attributes_json, created_at
                FROM audit_logs
                WHERE center_id = :centerId
                """);
        if (eventType != null) {
            sql.append(" AND event_type = :eventType ");
        }
        sql.append(" ORDER BY created_at DESC, audit_log_id DESC LIMIT :limit");

        JdbcClient.StatementSpec statement = jdbcClient.sql(sql.toString())
                .param("centerId", centerId)
                .param("limit", limit);
        if (eventType != null) {
            statement = statement.param("eventType", eventType);
        }
        return statement.query(AuditLog.class).list();
    }

    public record InsertCommand(
            Long centerId,
            String eventType,
            Long actorUserId,
            String resourceType,
            String resourceId,
            java.time.OffsetDateTime eventAt,
            String traceId,
            String attributesJson
    ) {
    }
}
