CREATE TABLE IF NOT EXISTS audit_logs (
    audit_log_id BIGSERIAL PRIMARY KEY,
    center_id BIGINT NOT NULL REFERENCES centers(center_id),
    event_type VARCHAR(50) NOT NULL,
    actor_user_id BIGINT NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100) NOT NULL,
    event_at TIMESTAMPTZ NOT NULL,
    trace_id VARCHAR(100),
    attributes_json TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_center_event_created
    ON audit_logs (center_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created
    ON audit_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS audit_retention_job_runs (
    audit_retention_job_run_id BIGSERIAL PRIMARY KEY,
    job_name VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'PARTIAL')),
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    details_json TEXT,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_retention_job_runs_job_completed
    ON audit_retention_job_runs (job_name, completed_at DESC);
