CREATE TABLE IF NOT EXISTS crm_message_events (
    crm_message_event_id BIGSERIAL PRIMARY KEY,
    center_id BIGINT NOT NULL REFERENCES centers (center_id),
    member_id BIGINT NOT NULL REFERENCES members (member_id),
    membership_id BIGINT NULL REFERENCES member_memberships (membership_id),
    event_type VARCHAR(50) NOT NULL,
    channel_type VARCHAR(20) NOT NULL DEFAULT 'SMS',
    dedupe_key VARCHAR(180) NOT NULL,
    payload_json TEXT,
    send_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_attempted_at TIMESTAMPTZ NULL,
    next_attempt_at TIMESTAMPTZ NULL,
    sent_at TIMESTAMPTZ NULL,
    failed_at TIMESTAMPTZ NULL,
    last_error_message TEXT,
    trace_id VARCHAR(64) NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NOT NULL,
    CONSTRAINT chk_crm_message_events_status
        CHECK (send_status IN ('PENDING', 'RETRY_WAIT', 'SENT', 'DEAD')),
    CONSTRAINT chk_crm_message_events_channel
        CHECK (channel_type IN ('SMS', 'KAKAO', 'EMAIL'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_crm_message_events_dedupe_key
    ON crm_message_events (dedupe_key)
    WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_crm_message_events_dispatch
    ON crm_message_events (center_id, send_status, next_attempt_at, crm_message_event_id)
    WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_crm_message_events_member
    ON crm_message_events (center_id, member_id, created_at DESC)
    WHERE is_deleted = FALSE;
