package com.gymcrm.audit;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class AuditRetentionJobRunRepository {
    private final JdbcClient jdbcClient;

    public AuditRetentionJobRunRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public AuditRetentionJobRun insert(InsertCommand command) {
        return jdbcClient.sql("""
                INSERT INTO audit_retention_job_runs (
                    job_name, status, started_at, completed_at, details_json, created_by
                ) VALUES (
                    :jobName, :status, :startedAt, :completedAt, :detailsJson, :createdBy
                )
                RETURNING
                    audit_retention_job_run_id, job_name, status, started_at, completed_at,
                    details_json, created_by, created_at
                """)
                .paramSource(command)
                .query(AuditRetentionJobRun.class)
                .single();
    }

    public List<AuditRetentionJobRun> findRecent(String jobName, int limit) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    audit_retention_job_run_id, job_name, status, started_at, completed_at,
                    details_json, created_by, created_at
                FROM audit_retention_job_runs
                WHERE 1=1
                """);
        if (jobName != null) {
            sql.append(" AND job_name = :jobName ");
        }
        sql.append(" ORDER BY completed_at DESC, audit_retention_job_run_id DESC LIMIT :limit");

        JdbcClient.StatementSpec statement = jdbcClient.sql(sql.toString())
                .param("limit", limit);
        if (jobName != null) {
            statement = statement.param("jobName", jobName);
        }
        return statement.query(AuditRetentionJobRun.class).list();
    }

    public record InsertCommand(
            String jobName,
            String status,
            java.time.OffsetDateTime startedAt,
            java.time.OffsetDateTime completedAt,
            String detailsJson,
            Long createdBy
    ) {
    }
}
