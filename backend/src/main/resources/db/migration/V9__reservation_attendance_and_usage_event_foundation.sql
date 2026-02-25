ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS no_show_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ NULL;

ALTER TABLE reservations
    DROP CONSTRAINT IF EXISTS chk_reservations_status;

ALTER TABLE reservations
    ADD CONSTRAINT chk_reservations_status
        CHECK (reservation_status IN ('CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'));

ALTER TABLE reservations
    ADD CONSTRAINT chk_reservations_no_show_at
        CHECK (
            (reservation_status = 'NO_SHOW' AND no_show_at IS NOT NULL)
            OR
            (reservation_status <> 'NO_SHOW')
        );

CREATE TABLE IF NOT EXISTS membership_usage_events (
    usage_event_id BIGSERIAL PRIMARY KEY,
    center_id BIGINT NOT NULL REFERENCES centers (center_id),
    membership_id BIGINT NOT NULL REFERENCES member_memberships (membership_id),
    reservation_id BIGINT NOT NULL REFERENCES reservations (reservation_id),
    usage_event_type VARCHAR(40) NOT NULL,
    delta_count INTEGER NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_by BIGINT NOT NULL,
    memo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_membership_usage_events_type
        CHECK (usage_event_type IN ('RESERVATION_COMPLETE'))
);

CREATE INDEX IF NOT EXISTS idx_membership_usage_events_membership_processed
    ON membership_usage_events (membership_id, processed_at DESC);

CREATE INDEX IF NOT EXISTS idx_membership_usage_events_reservation
    ON membership_usage_events (reservation_id);

CREATE INDEX IF NOT EXISTS idx_membership_usage_events_type_processed
    ON membership_usage_events (usage_event_type, processed_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uk_membership_usage_events_reservation_type
    ON membership_usage_events (reservation_id, usage_event_type);
