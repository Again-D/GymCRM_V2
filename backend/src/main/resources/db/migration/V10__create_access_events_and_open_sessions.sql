CREATE TABLE IF NOT EXISTS access_events (
    access_event_id BIGSERIAL PRIMARY KEY,
    center_id BIGINT NOT NULL REFERENCES centers (center_id),
    member_id BIGINT NOT NULL REFERENCES members (member_id),
    membership_id BIGINT NULL REFERENCES member_memberships (membership_id),
    reservation_id BIGINT NULL REFERENCES reservations (reservation_id),
    processed_by BIGINT NOT NULL,
    event_type VARCHAR(30) NOT NULL,
    deny_reason VARCHAR(80),
    processed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_access_events_type
        CHECK (event_type IN ('ENTRY_GRANTED', 'EXIT', 'ENTRY_DENIED')),
    CONSTRAINT chk_access_events_deny_reason
        CHECK (
            (event_type = 'ENTRY_DENIED' AND deny_reason IS NOT NULL)
            OR
            (event_type <> 'ENTRY_DENIED' AND deny_reason IS NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_access_events_center_processed_at
    ON access_events (center_id, processed_at DESC);

CREATE INDEX IF NOT EXISTS idx_access_events_member_processed_at
    ON access_events (member_id, processed_at DESC);

CREATE INDEX IF NOT EXISTS idx_access_events_type_processed_at
    ON access_events (event_type, processed_at DESC);

CREATE TABLE IF NOT EXISTS member_access_sessions (
    access_session_id BIGSERIAL PRIMARY KEY,
    center_id BIGINT NOT NULL REFERENCES centers (center_id),
    member_id BIGINT NOT NULL REFERENCES members (member_id),
    membership_id BIGINT NULL REFERENCES member_memberships (membership_id),
    reservation_id BIGINT NULL REFERENCES reservations (reservation_id),
    entry_event_id BIGINT NOT NULL REFERENCES access_events (access_event_id),
    entry_at TIMESTAMPTZ NOT NULL,
    exit_event_id BIGINT NULL REFERENCES access_events (access_event_id),
    exited_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_member_access_sessions_exit_pair
        CHECK (
            (exit_event_id IS NULL AND exited_at IS NULL)
            OR
            (exit_event_id IS NOT NULL AND exited_at IS NOT NULL AND exited_at >= entry_at)
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_member_access_sessions_entry_event
    ON member_access_sessions (entry_event_id);

CREATE UNIQUE INDEX IF NOT EXISTS uk_member_access_sessions_exit_event
    ON member_access_sessions (exit_event_id)
    WHERE exit_event_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_member_access_sessions_open_per_member
    ON member_access_sessions (center_id, member_id)
    WHERE exited_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_member_access_sessions_center_open
    ON member_access_sessions (center_id, entry_at DESC)
    WHERE exited_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_member_access_sessions_member_entry
    ON member_access_sessions (member_id, entry_at DESC);
